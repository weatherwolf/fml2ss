import base64, json, os, requests, copy, math
from types import SimpleNamespace
import numpy as np
from bezier import adaptive_bezier_segments
from utils import Vertex, Wall, parse_command_line
from min_cycles import extract_rooms_from_screenscript

API_ENDPOINT = 'https://floorplanner.com/api/v2'
API_KEY = os.environ.get('FP_API_KEY', None)

def get(url, auth=None):
    headers = {}
    if auth:
        headers['Authorization'] = auth
    r = requests.get(url, headers=headers)
    return r.text

def load_project(id):
    auth = 'Basic %s' % base64.b64encode(('%s:x' % API_KEY).encode()).decode()
    url = '%s/projects/%s/fml' % (API_ENDPOINT, str(id))
    return json.loads(get(url, auth), object_hook=lambda d: SimpleNamespace(**d))

def cm_to_m_snap(cm_value, snap_value=None, decimals=2):
    """
    Convert centimeters to meters and optionally snap to an arbitrary value.

    Args:
        cm_value (float): Value in centimeters
        snap_value (float, optional): Value to snap to in meters. If None, no snapping occurs.
        decimals (int, optional): Number of decimal places to round to. Defaults to 2.

    Returns:
        float: Value in meters, optionally snapped to the specified value with specified decimal places
    """
    # Convert centimeters to meters
    meters = cm_value / 100.0

    # If no snap value is provided, return the converted value rounded to specified decimals
    if snap_value is None:
        return round(meters, decimals)

    # Snap to the nearest multiple of snap_value
    snapped_value = round(meters / snap_value) * snap_value
    return round(snapped_value, decimals)

def make_opening(w, opening, doors, windows, snap_value=None, decimals=2):
    a = np.array([w['a_x'], w['a_y'], w['a_z']])
    b = np.array([w['b_x'], w['b_y'], w['b_z']])
    ba = (b - a)
    pos = (a + opening.t * ba).tolist()
    is_door = opening.type == 'door'
    arr = doors if opening.type == 'door' else windows
    id = len(arr) + 1000 if is_door else len(arr) + 2000
    o = {
        'id': id,
        'wall0_id': w['id'],
        'wall1_id': -1,
        'position_x': round(pos[0], decimals),
        'position_y': round(pos[1], decimals),
        'position_z': round(opening.z * 0.01, decimals),
        'width': round(opening.width * 0.01, decimals),
        'height': round(opening.z_height * 0.01, decimals),
    }
    cmd = 'make_door' if is_door else 'make_window'
    arr.append('%s, %s' % (cmd, ', '.join([f'{k}={v}' for k, v in o.items()])))


def make_wall(id, wall, doors, windows, snap_value=None, decimals=2):
    w = {
        'id': id,
        'a_x': cm_to_m_snap(wall.a.x, snap_value, decimals),
        'a_y': cm_to_m_snap(wall.a.y, snap_value, decimals),
        'a_z': 0.0,
        'b_x': cm_to_m_snap(wall.b.x, snap_value, decimals),
        'b_y': cm_to_m_snap(wall.b.y, snap_value, decimals),
        'b_z': 0.0,
        'heigth': cm_to_m_snap(wall.az.h, snap_value, decimals),
        'thickness': cm_to_m_snap(wall.thickness, snap_value, decimals)
    }

    for opening in wall.openings:
        make_opening(w, opening, doors, windows, snap_value, decimals)
    return 'make_wall, %s' % ', '.join([f'{k}={v}' for k, v in w.items()])

"""
make_bbox,
    id=3032,
    class=chair,
    position_x=-1.948361873626709,
    position_y=5.060364246368408,
    position_z=0.5710381269454956,
    angle_z=-2.2972949999999996,
    scale_x=0.46875,
    scale_y=0.5625,
    scale_z=1.125
"""

def make_bbox(item, bboxes, snap_value=None, decimals=2):
    b = {
        'id': 3000 + len(bboxes),
        'refid': item.refid,
        'class': hasattr(item, 'role') and item.role or 'unknown',
        'position_x': cm_to_m_snap(item.x, snap_value, decimals),
        'position_y': cm_to_m_snap(item.y, snap_value, decimals),
        'position_z': cm_to_m_snap(item.z, snap_value, decimals),
        'scale_x': cm_to_m_snap(item.width, snap_value, decimals),
        'scale_y': cm_to_m_snap(item.height, snap_value, decimals),
        'scale_z': cm_to_m_snap(item.z_height, snap_value, decimals),
        'angle_z': math.radians(item.rotation)
    }
    bboxes.append('make_bbox, %s' % ', '.join([f'{k}={v}' for k, v in b.items()]))

def make_design(design, snap_value=None, decimals=2):
    doors = []
    windows = []

    curved_walls = [wall for wall in design.walls if wall.c]
    design.walls = [wall for wall in design.walls if not wall.c]

    for wall in curved_walls:
        a = np.array([wall.a.x, wall.a.y])
        b = np.array([wall.b.x, wall.b.y])
        c = np.array([wall.c.x, wall.c.y])
        segs = adaptive_bezier_segments(a, c, b, 0.01, 10)
        for i, seg in enumerate(segs[:-1]):
            seg2 = segs[i+1] if i+1 < len(segs) else segs[0]
            w = copy.deepcopy(wall)
            w.a.x = seg[0]
            w.a.y = seg[1]
            w.b.x = seg2[0]
            w.b.y = seg2[1]
            w.c = None
            design.walls.append(w)

    walls = [make_wall(i, wall, doors, windows, snap_value, decimals) for i, wall in enumerate(design.walls)]
    rooms = []
    if len(walls) > 0:
        rooms = extract_rooms_from_screenscript(walls)
    bboxes = []

    [make_bbox(item, bboxes, snap_value, decimals) for i, item in enumerate(design.items)]

    commands = ''
    if len(walls) > 0:
        commands += '\n' + '\n'.join(walls)
    if len(doors) > 0:
        commands += '\n' + '\n'.join(doors)
    if len(windows) > 0:
        commands += '\n' + '\n'.join(windows)
    if len(bboxes) > 0:
        commands += '\n' + '\n'.join(bboxes)
    if len(rooms) > 0:
        commands += '\n' + '\n'.join(rooms)

    return commands

def make_project(project_id, snap_value=None, decimals=2):
    """
    Returns a dictionary of design ids to design screenscript commands from a FML project.

    Args:
        project_id (int): Project ID
        snap_value (float, optional): Value to snap to in meters. If None, no snapping occurs.
        decimals (int, optional): Number of decimal places to round to. Defaults to 2.

    Returns:
        dict: Dictionary of design ids to design screenscript commands
    """
    project = load_project(project_id)
    return {'fml': project,
        'screenscript': {
            design.id : make_design(design, snap_value, decimals) for floor in project.floors for design in floor.designs
        }
    }

if __name__ == '__main__':
    result = make_project(61301631, None, 2)
    #result = make_project(175356817, None, 2)
    for design_id, design in result['screenscript'].items():
        print(design_id)
        print(design)
        print('-' * 100)