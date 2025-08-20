import base64, json, os, requests, copy, math
from types import SimpleNamespace
import hashlib
import requests
from floorscript import make_project, dataclass_to_dict
from summarizer.summarization_service import SummarizationService
from summarizer.data_reader import DataReader

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
        
        # Track room creation to identify duplicates
        if not hasattr(Room, 'created_rooms'):
            Room.created_rooms = set()
        
        if self.id in Room.created_rooms:
            pass  # Duplicate room detected
        else:
            Room.created_rooms.add(self.id)
            
        for wall in obj.walls:
            self.walls.append(Wall(wall, self.id))

        for item in obj.items:
            item_data = None
            try:
                id_body = { 'ids': [item.refid] }
                item_data = requests.post(
                    'https://search.floorplanner.com/products/ids', 
                    json=id_body
                )
                item_data = item_data.json()
            except Exception as e:
                print(e)
            
            # Merge item_data with the original item data
            if item_data:
                # Convert item object to dict and add item_data
                enhanced_item = get_obj_dict(item)
                
                # Extract specific fields from the API response if available
                try:
                    if 'hits' in item_data and 'hits' in item_data['hits'] and len(item_data['hits']['hits']) > 0:
                        hit = item_data['hits']['hits'][0]["_source"]
                        if 'name' in hit:
                            enhanced_item['name'] = hit['name']
                        if 'brand' in hit:
                            enhanced_item['brand'] = hit['brand']
                except Exception as e:
                    print(f"Error extracting fields from item_data: {e}")
            else:
                enhanced_item = get_obj_dict(item)
            
            self.items.append(Item(enhanced_item, self.id))

        # Check if room already has a summary to avoid regenerating
        current_attrs = json.loads(self.attrs)
        if 'summary' not in current_attrs:
            # Generate new summary only if one doesn't exist
            if not hasattr(Room, '_summarization_service'):
                Room._summarization_service = SummarizationService()
            self.summary = Room._summarization_service.summarize_room(obj)
            # self.summary = 'this is a test summary for a house with 6 rooms and a big golden duck in the middle of the living room'
            
            # Store the summary in the room's attrs so it can be accessed later
            if self.summary:
                try:
                    # Update the attrs to include the summary
                    current_attrs['summary'] = self.summary
                    self.attrs = json.dumps(current_attrs)
                except Exception as e:
                    print(f"Error storing summary in room attrs: {e}")
            else:
                print("Warning: No summary generated for room")
    
    def to_dict(self):
        # Override to ensure we include the updated attrs with summary
        return {
            'id': self.id,
            'parent_id': self.parent_id,
            'type': self.type,
            'attrs': json.loads(self.attrs),  # This now includes the summary
        }

class Design(Element):
    def __init__(self, obj, parent_id=None):
        super().__init__(obj, 'design', parent_id)
        self.rooms = []
        self.room_objects = []  # Keep track of room objects for writing

        for i, room in enumerate(obj.rooms):
            print(f"        Room {i}: {room.name if hasattr(room, 'name') else 'unnamed'} (ID: {room.id if hasattr(room, 'id') else 'no-id'})")
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
        for i, design in enumerate(obj.designs):
            design_obj = Design(design, self.id)  # Create ONCE
            self.designs.append(design_obj.id)    # Store the ID
            self.design_objects.append(design_obj) # Store the object

    def to_dict(self):
        return {
            'id': self.id,
            'parent_id': self.parent_id,
            'type': self.type,
            'designs': self.designs,
            'attrs': self.attrs_to_dict(remove_keys=['designs']),
        }

    def write(self, outdir):
        # First, write all designs and rooms
        for design in self.design_objects:
            design.write(outdir)
        
        # Write the floor JSON first so it exists when we try to read it
        super().write(outdir)
        
        # Generate floor summary AFTER all rooms have been written and have summaries
        # Check if floor already has a summary to avoid regenerating
        current_attrs = json.loads(self.attrs)
        
        if 'summary' in current_attrs and current_attrs['summary']:
            pass  # Floor already has a summary, skipping generation
        else:
            try:
                # Get room summaries for floor summarization
                rooms = DataReader.get_rooms_for_floor(self.id, outdir)
                room_summaries = ""
                
                for room in rooms:
                    if 'attrs' in room and 'summary' in room['attrs'] and room['attrs']['summary']:
                        room_summaries += room['attrs']['summary'] + "\n"
                
                if room_summaries.strip():
                    if not hasattr(Floor, '_summarization_service'):
                        Floor._summarization_service = SummarizationService()
                    floor_summary = Floor._summarization_service.summarize_floor(room_summaries)
                    if floor_summary:
                        # Store the floor summary in the floor's attrs
                        current_attrs['summary'] = floor_summary
                        self.attrs = json.dumps(current_attrs)
                        # Write the updated floor JSON with the summary
                        super().write(outdir)
                    else:
                        print(f"Warning: No floor summary generated")
                else:
                    print(f"Warning: No room summaries found for floor summarization")
            except Exception as e:
                print(f"Error generating floor summary: {e}")

class Project(Element):
    def __init__(self, obj):
        super().__init__(obj, 'project')
        self.floors = []
        self.floor_objects = []
        for i, floor in enumerate(obj.floors):
            floor_obj = Floor(floor, self.id)  # Create ONCE
            self.floors.append(floor_obj.id)   # Store the ID
            self.floor_objects.append(floor_obj) # Store the object

    def to_dict(self):
        return {
            'id': self.id,
            'parent_id': self.parent_id,
            'type': self.type,
            'floors': self.floors,
            'attrs': self.attrs_to_dict(remove_keys=['floors']),
        }

    def write(self, outdir):
        # Write project JSON first so it exists when we try to read it
        super().write(outdir)
        
        # Write all floors
        for floor in self.floor_objects:
            floor.write(outdir)
        
        # Generate project summary AFTER all floors have been written and have summaries
        # Check if project already has a summary to avoid regenerating
        current_attrs = json.loads(self.attrs)
        
        if 'summary' in current_attrs and current_attrs['summary']:
            pass  # Project already has a summary, skipping generation
        else:
            try:
                # Get floor summaries for project summarization
                floors = DataReader.get_floors_for_project(self.id, outdir)
                floor_summaries = ""
                
                for floor in floors:
                    if 'attrs' in floor and 'summary' in floor['attrs'] and floor['attrs']['summary']:
                        floor_summaries += floor['attrs']['summary'] + "\n"
                
                if floor_summaries.strip():
                    if not hasattr(Project, '_summarization_service'):
                        Project._summarization_service = SummarizationService()
                    project_summary = Project._summarization_service.summarize_project(floor_summaries)
                    if project_summary:
                        # Store the project summary in the project's attrs
                        current_attrs['summary'] = project_summary
                        self.attrs = json.dumps(current_attrs)
                        # Write the updated project JSON with the summary
                        super().write(outdir)
                    else:
                        print(f"Warning: No project summary generated")
                else:
                    print(f"Warning: No floor summaries found for project summarization")
            except Exception as e:
                print(f"Error generating project summary: {e}")

            

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

    project.write('output_reference_items')

