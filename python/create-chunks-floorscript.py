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

    auth = 'Basic %s' % base64.b64encode(('%s:x' % API_KEY).encode()).decode()
    url = '%s/projects/%s/fml' % (API_ENDPOINT, str(id))
    return json.loads(get(url, auth), object_hook=lambda d: SimpleNamespace(**d))

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

class Room(Element):
    def __init__(self, obj, parent_id=None):
        super().__init__(obj, 'room', parent_id)
        self.walls = []
        self.items = []
        for wall in obj.walls:
            self.walls.append(Wall(wall, self.id))

        for item in obj.items:
            self.items.append(Item(item, self.id))

class Item(Element):
    def __init__(self, obj, parent_id=None):
        super().__init__(obj, 'item', parent_id)

    def write(self, outdir):
        return super().write(outdir)

class Design(Element):
    def __init__(self, obj, parent_id=None):
        super().__init__(obj, 'design', parent_id)
        self.rooms = []
        for room in obj.rooms:
            self.rooms.append(Room(room, self.id))

    def write(self, outdir):
        super().write(outdir)
        for room in self.rooms:
            room.write(outdir)

class Floor(Element):
    def __init__(self, obj, parent_id=None):
        super().__init__(obj, 'floor', parent_id)
        self.designs = []
        for design in obj.designs:
            self.designs.append(Design(design, self.id))

    def write(self, outdir):
        super().write(outdir)
        for design in self.designs:
            design.write(outdir)

class Project(Element):
    def __init__(self, obj):
        super().__init__(obj, 'project')
        self.floors = []
        for floor in obj.floors:
            self.floors.append(Floor(floor, self.id))

    def write(self, outdir):
        super().write(outdir)
        for floor in self.floors:
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

    project.write('output')

