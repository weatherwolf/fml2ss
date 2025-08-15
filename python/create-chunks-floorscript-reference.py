import base64, json, os, requests, copy, math
from types import SimpleNamespace
import hashlib
from floorscript import make_project, dataclass_to_dict

API_ENDPOINT = 'https://floorplanner.com/api/v2'
API_KEY = os.environ.get('FP_API_KEY', None)

def get(url, auth=None):
    headers = {}
    if auth:
        headers['Authorization'] = auth
    r = requests.get(url, headers=headers)
    return r.text

def load_project(id):
    project = make_project(id, None, 2)
    return project['hierarchical']

def get_obj_dict(obj):
    return obj.__dict__

def create_element_hash(obj):
    m = hashlib.sha256()
    m.update(json.dumps(obj, default=get_obj_dict).encode('utf-8'))
    return m.digest().hex()

class Element:
    def __init__(self, obj, type, parent_id=None):
        self.id = create_element_hash(obj)
        self.parent_id = parent_id
        self.type = type
        self.attrs = json.dumps(obj, default=get_obj_dict)

    def to_dict(self):
        return {
            'id': self.id,
            'parent_id': self.parent_id,
            'type': self.type,
            'attrs': json.loads(self.attrs),
        }
    
    def attrs_to_dict(self, remove_keys):
        attrs = json.loads(self.attrs)
        for key in remove_keys:
            if key in attrs:
                del attrs[key]
        return attrs

    def write(self, outdir):
        outfile = os.path.join(outdir, self.type, f'{self.id}.json')
        os.makedirs(os.path.dirname(outfile), exist_ok=True)
        with open(outfile, 'w') as f:
            f.write(json.dumps(self.to_dict(), indent=2))

class Wall(Element):
    def __init__(self, obj, parent_id=None):
        super().__init__(obj, 'wall', parent_id)

    def write(self, outdir):
        return super().write(outdir)
    
class Item(Element):
    def __init__(self, obj, parent_id=None):
        super().__init__(obj, 'item', parent_id)

    def write(self, outdir):
        return super().write(outdir)

class Room(Element):
    def __init__(self, obj, parent_id=None):
        super().__init__(obj, 'room', parent_id)
        self.walls = []
        self.items = []
        for wall in obj.walls:
            self.walls.append(Wall(wall, self.id))

        for item in obj.items:
            self.items.append(Item(item, self.id))

class Design(Element):
    def __init__(self, obj, parent_id=None):
        super().__init__(obj, 'design', parent_id)
        self.rooms = []
        self.room_objects = []  # Keep track of room objects for writing
        for room in obj.rooms:
            room_obj = Room(room, self.id)
            self.rooms.append(room_obj.id)  # Store ID for JSON
            self.room_objects.append(room_obj)  # Store object for writing

    def to_dict(self):
        return {
            'id': self.id,
            'parent_id': self.parent_id,
            'type': self.type,
            'rooms': self.rooms,
            'attrs': self.attrs_to_dict(remove_keys=['rooms']),
        }

    def write(self, outdir):
        super().write(outdir)
        for room_obj in self.room_objects:  # Use objects for writing
            room_obj.write(outdir)

class Floor(Element):
    def __init__(self, obj, parent_id=None):
        super().__init__(obj, 'floor', parent_id)
        self.designs = []
        self.design_objects = []
        for design in obj.designs:
            self.designs.append(Design(design, self.id).id)
            self.design_objects.append(Design(design, self.id))

    def to_dict(self):
        return {
            'id': self.id,
            'parent_id': self.parent_id,
            'type': self.type,
            'designs': self.designs,
            'attrs': self.attrs_to_dict(remove_keys=['designs']),
        }

    def write(self, outdir):
        super().write(outdir)
        for design in self.design_objects:
            design.write(outdir)

class Project(Element):
    def __init__(self, obj):
        super().__init__(obj, 'project')
        self.floors = []
        self.floor_objects = []
        for floor in obj.floors:
            self.floors.append(Floor(floor, self.id).id)
            self.floor_objects.append(Floor(floor, self.id))

    def to_dict(self):
        return {
            'id': self.id,
            'parent_id': self.parent_id,
            'type': self.type,
            'floors': self.floors,
            'attrs': self.attrs_to_dict(remove_keys=['floors']),
        }

    def write(self, outdir):
        super().write(outdir)
        for floor in self.floor_objects:
            floor.write(outdir)

def create_element(obj, type, parent_id=None):
    attrs = json.dumps(obj, default=get_obj_dict).encode('utf-8')
    return {
        'id': create_element_hash(obj),
        'parent_id': parent_id,
        'type': type,
        #'attrs': json.loads(attrs),
    }

if __name__ == '__main__':

    project = Project(load_project(61301631))

    project.write('output_reference')

