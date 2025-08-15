import base64, json, os, requests, copy, math
from types import SimpleNamespace
import numpy as np
from bezier import adaptive_bezier_segments
from dataclasses import dataclass, field
from typing import List, Dict
from min_cycles import extract_rooms_from_screenscript_ids
from he import point_in_polygon

API_ENDPOINT = 'https://floorplanner.com/api/v2'
API_KEY = os.environ.get('FP_API_KEY', None)

# Data classes for hierarchical structure
@dataclass
class RoomItem:
    """Represents an item within a room"""
    id: int
    refid: str
    class_name: str
    position_x: float
    position_y: float
    position_z: float
    scale_x: float
    scale_y: float
    scale_z: float
    angle_z: float
    

@dataclass
class RoomWall:
    """Represents a wall that forms part of a room"""
    id: int
    a_x: float
    a_y: float
    a_z: float
    b_x: float
    b_y: float
    b_z: float
    height: float
    thickness: float
    openings: List[Dict] = field(default_factory=list)

@dataclass
class Room:
    """Represents a room with its walls and items"""
    id: int
    name: str = "Room"
    walls: List[RoomWall] = field(default_factory=list)
    items: List[RoomItem] = field(default_factory=list)
    area: float = 0.0

@dataclass
class Design:
    """Represents a design with rooms and unassigned elements"""
    id: int
    name: str
    rooms: List[Room] = field(default_factory=list)
    unassigned_walls: List[RoomWall] = field(default_factory=list)
    unassigned_items: List[RoomItem] = field(default_factory=list)

@dataclass
class Floor:
    """Represents a floor with designs"""
    id: int
    name: str
    level: int
    height: float
    designs: List[Design] = field(default_factory=list)

@dataclass
class Project:
    """Represents the complete project structure"""
    id: int
    name: str
    description: str
    settings: Dict
    floors: List[Floor] = field(default_factory=list)

def calculate_polygon_area(polygon):
    """
    Calculate the area of a polygon using shoelace formula.
    
    Args:
        polygon: list of tuples [(x1, y1), (x2, y2), ...] representing polygon vertices
        
    Returns:
        float: Area of the polygon
    """
    n = len(polygon)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += polygon[i][0] * polygon[j][1]
        area -= polygon[j][0] * polygon[i][1]
    return abs(area) / 2.0

def get(url, auth=None):
    headers = {}
    if auth:
        headers['Authorization'] = auth
    r = requests.get(url, headers=headers)
    return r.text

def load_project(id):
    auth = 'Basic %s' % base64.b64encode(('%s:x' % API_KEY).encode()).decode()
    url = '%s/projects/%s/fml' % (API_ENDPOINT, str(id))
    with open('project.json', 'w') as f:
        f.write(get(url, auth))
    return json.loads(get(url, auth), object_hook=lambda d: SimpleNamespace(**d))

def cm_to_m_snap(cm_value, snap_value=None, decimals=2):
    """
    Convert centimeters to meters with consistent rounding.

    Args:
        cm_value (float): Value in centimeters
        snap_value (float, optional): Value to snap to in meters. If None, no snapping occurs.
        decimals (int, optional): Number of decimal places to round to. Defaults to 2.

    Returns:
        float: Value in meters, optionally snapped to the specified value with specified decimal places
    """
    # Convert centimeters to meters
    meters = cm_value / 100.0
    meters = meters - 0.001

    if snap_value is None:
        # Round to fixed precision to avoid floating-point issues
        factor = 10 ** decimals
        return round(meters * factor) / factor
    
    # Snap to the nearest multiple of snap_value
    snapped_value = round(meters / snap_value) * snap_value
    return round(snapped_value, decimals)


def create_room_polygon(room):
    walls = []
    for wall in room.walls:
        walls.append([(wall.a_x, wall.a_y), (wall.b_x, wall.b_y)])

    starting_point = walls[0][0]
    polygon = [starting_point]
    current_point = starting_point
    
    while len(walls) > 0:
        for wall in walls:
            if wall[0] == current_point:
                polygon.append(wall[1])
                current_point = wall[1]
                walls.remove(wall)
                break
            elif wall[1] == current_point:
                polygon.append(wall[0])
                current_point = wall[0]
                walls.remove(wall)
                break

    polygon.append(polygon[0])


    return polygon


def make_design_json(design, snap_value=None, decimals=2, parent_design_id=None):
    """
    Convert a design to hierarchical JSON structure with rooms, walls, and items.
    
    Args:
        design: FML design object
        snap_value: Optional snap value for coordinates
        decimals: Number of decimal places for coordinates
        parent_design_id: ID of the parent design
        
    Returns:
        Design object with hierarchical structure
    """
    # Handle curved walls by converting them to straight segments
    curved_walls = [wall for wall in design.walls if wall.c]
    straight_walls = [wall for wall in design.walls if not wall.c]

    # Convert curved walls to straight segments
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
            straight_walls.append(w)
    
    # Create wall objects for room detection
    wall_objects = []
    for i, wall in enumerate(straight_walls):
        wall_obj = {
            'id': i,
            'a_x': cm_to_m_snap(wall.a.x, snap_value, decimals),
            'a_y': cm_to_m_snap(wall.a.y, snap_value, decimals),
            'a_z': 0.0,
            'b_x': cm_to_m_snap(wall.b.x, snap_value, decimals),
            'b_y': cm_to_m_snap(wall.b.y, snap_value, decimals),
            'b_z': 0.0,
            'height': cm_to_m_snap(wall.az.h, snap_value, decimals),
            'thickness': cm_to_m_snap(wall.thickness, snap_value, decimals),
            'openings': []
        }
        wall_objects.append(wall_obj)

        for opening in wall.openings:

            a = np.array([wall_obj['a_x'], wall_obj['a_y'], wall_obj['a_z']])
            b = np.array([wall_obj['b_x'], wall_obj['b_y'], wall_obj['b_z']])
            ba = (b - a)
            pos = (a + opening.t * ba).tolist()

            opening_obj = {
                'id': opening.refid,
                'wall0_id': wall_obj['id'],
                'wall1_id': -1,
                'position_x': round(pos[0], decimals),
                'position_y': round(pos[1], decimals),
                'position_z': round(opening.z * 0.01, decimals),
                'width': round(opening.width * 0.01, decimals),
                'height': round(opening.z_height * 0.01, decimals),
                'type': opening.type
            }
            wall_obj['openings'].append(opening_obj)
    
    # Convert wall objects to the format expected by extract_rooms_from_screenscript_ids
    wall_commands = []
    for wall_obj in wall_objects:
        wall_command = f"make_wall, id={wall_obj['id']}, a_x={wall_obj['a_x']}, a_y={wall_obj['a_y']}, a_z={wall_obj['a_z']}, b_x={wall_obj['b_x']}, b_y={wall_obj['b_y']}, b_z={wall_obj['b_z']}, height={wall_obj['height']}, thickness={wall_obj['thickness']}"
        wall_commands.append(wall_command)
    
    # Extract rooms using existing logic
    rooms_dict = extract_rooms_from_screenscript_ids(wall_commands)

    
    # Create hierarchical design structure
    design_obj = Design(
        id=design.id if hasattr(design, 'id') else parent_design_id,
        name=getattr(design, 'name', 'Design')
    )
    
    # Process rooms
    for room_id, wall_ids in rooms_dict.items():
        room = Room(id=room_id, name=f"Room {room_id}")
        
        # Add walls to room
        for wall_id in wall_ids:
            if wall_id < len(wall_objects):
                wall_data = wall_objects[wall_id]
                room_wall = RoomWall(
                    id=wall_id,
                    a_x=wall_data['a_x'],
                    a_y=wall_data['a_y'],
                    a_z=wall_data['a_z'],
                    b_x=wall_data['b_x'],
                    b_y=wall_data['b_y'],
                    b_z=wall_data['b_z'],
                    height=wall_data['height'],
                    thickness=wall_data['thickness'],
                    openings=wall_data['openings']  # Transfer the openings
                )
                room.walls.append(room_wall)
        
        # Calculate room area
        if len(room.walls) >= 3:
            # Create polygon from wall vertices
            polygon = create_room_polygon(room)
            room.area = calculate_polygon_area(polygon)
        
        design_obj.rooms.append(room)
    
    # Add unassigned walls (walls not in any room)
    assigned_wall_ids = set()
    for room in design_obj.rooms:
        for wall in room.walls:
            assigned_wall_ids.add(wall.id)
    
    for i, wall_data in enumerate(wall_objects):
        if i not in assigned_wall_ids:
            unassigned_wall = RoomWall(
                id=wall_data['id'],
                a_x=wall_data['a_x'],
                a_y=wall_data['a_y'],
                a_z=wall_data['a_z'],
                b_x=wall_data['b_x'],
                b_y=wall_data['b_y'],
                b_z=wall_data['b_z'],
                height=wall_data['height'],
                thickness=wall_data['thickness'],
                openings=wall_data['openings']  # Transfer the openings
            )
            design_obj.unassigned_walls.append(unassigned_wall)
    
    # Process items and assign them to rooms
    for i, item in enumerate(design.items):
        item_obj = RoomItem(
            id=3000 + i,
            refid=getattr(item, 'refid', ''),
            class_name=getattr(item, 'role', 'unknown'),
            position_x=cm_to_m_snap(item.x, snap_value, decimals),
            position_y=cm_to_m_snap(item.y, snap_value, decimals),
            position_z=cm_to_m_snap(item.z, snap_value, decimals),
            scale_x=cm_to_m_snap(item.width, snap_value, decimals),
            scale_y=cm_to_m_snap(item.height, snap_value, decimals),
            scale_z=cm_to_m_snap(item.z_height, snap_value, decimals),
            angle_z=math.radians(item.rotation)
        )
        
        
        # Try to assign item to a room
        item_assigned = False
        for room in design_obj.rooms:
            if len(room.walls) >= 3:
                # Create polygon from room walls
                polygon = create_room_polygon(room)
                # Check if item center is inside room
                if point_in_polygon((item_obj.position_x, item_obj.position_y), polygon):
                    room.items.append(item_obj)
                    item_assigned = True
        
        # If item not assigned to any room, add to unassigned items
        if not item_assigned:
            design_obj.unassigned_items.append(item_obj)
    
    return design_obj

def convert_fml_to_hierarchical(project, snap_value=None, decimals=2):
    """
    Convert an FML project to hierarchical structure.
    
    Args:
        project: FML project object
        snap_value: Optional snap value for coordinates
        decimals: Number of decimal places for coordinates
        
    Returns:
        Project object with hierarchical structure
    """
    project_obj = Project(
        id=project.id,
        name=project.name,
        description=getattr(project, 'description', ''),
        settings=project.settings.__dict__ if hasattr(project, 'settings') else {}
    )
    
    # Process floors
    for floor in project.floors:
        floor_obj = Floor(
            id=floor.id,
            name=floor.name,
            level=floor.level,
            height=floor.height
        )
        
        # Process designs in each floor
        for design in floor.designs:
            design_obj = make_design_json(design, snap_value, decimals, design.id)
            if len(design_obj.rooms) > 0:
                floor_obj.designs.append(design_obj)
        
        if len(floor_obj.designs) > 0:
            project_obj.floors.append(floor_obj)
    
    return project_obj

def dataclass_to_dict(obj):
    """
    Convert dataclass objects to dictionaries for JSON serialization.
    
    Args:
        obj: Dataclass object or list/dict containing dataclass objects
        
    Returns:
        dict/list: JSON-serializable dictionary or list
    """
    if hasattr(obj, '__dict__'):
        result = {}
        for key, value in obj.__dict__.items():
            if hasattr(value, '__dict__'):
                result[key] = dataclass_to_dict(value)
            elif isinstance(value, list):
                result[key] = [dataclass_to_dict(item) for item in value]
            elif isinstance(value, dict):
                result[key] = {k: dataclass_to_dict(v) for k, v in value.items()}
            else:
                result[key] = value
        return result
    elif isinstance(obj, list):
        return [dataclass_to_dict(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: dataclass_to_dict(v) for k, v in obj.items()}
    else:
        return obj

def make_project(project_id, snap_value=None, decimals=2):
    """
    Returns hierarchical structure from a FML project.

    Args:
        project_id (int): Project ID
        snap_value (float, optional): Value to snap to in meters. If None, no snapping occurs.
        decimals (int, optional): Number of decimal places to round to. Defaults to 2.

    Returns:
        dict: Dictionary containing hierarchical structure
    """
    project = load_project(project_id)
    
    # Convert to hierarchical structure
    hierarchical_project = convert_fml_to_hierarchical(project, snap_value, decimals)
    
    return {
        'fml': project,
        'hierarchical': hierarchical_project
    }

if __name__ == '__main__':
    result = make_project(61301631, None, 2)
    # result = make_project(175356817, None, 2)

    print("=== HIERARCHICAL STRUCTURE ===")
    hierarchical_json = dataclass_to_dict(result['hierarchical'])
    # print(json.dumps(hierarchical_json, indent=2))
    with open('hierarchical.json', 'w') as f:
        json.dump(hierarchical_json, f, indent=2)