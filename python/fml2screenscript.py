import base64, json, os, requests
from types import SimpleNamespace
import numpy as np

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
    ba = b - a
    pos = (opening.t * ba).tolist()
    is_door = opening.type == 'door'
    arr = doors if opening.type == 'door' else windows
    id = len(arr) + 1000 if is_door else len(arr) + 2000
    o = {
        'id': id,
        'wall0_id': w['id'],
        'wall1_id': -1,
        'position_x': round(pos[0], decimals),
        'position_y': round(pos[1], decimals),
        'position_z': round(pos[2], decimals)
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

def make_design(design, snap_value=None, decimals=2):
    doors = []
    windows = []
    walls = [make_wall(i, wall, doors, windows, snap_value, decimals) for i, wall in enumerate(design.walls)]
    return '\n'.join(walls) + '\n' + '\n'.join(doors) + '\n' + '\n'.join(windows)

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
    return {
        design.id : 
        make_design(design, snap_value, decimals) for floor in project.floors for design in floor.designs
    }

#print(make_project(61301631, None, 2))