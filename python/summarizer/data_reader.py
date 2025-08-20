import os
import json
import sys

# Add the parent directory to the path so we can be imported from the main script
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

class DataReader:
    @staticmethod
    def read_json_file(file_path):
        """Read JSON file with error handling"""
        try:
            with open(file_path, 'r') as file:
                return json.load(file)
        except Exception as e:
            print(f"Error reading file {file_path}: {e}")
            return None
    
    @staticmethod
    def get_rooms_for_floor(floor_id, output_dir):
        """Get room data for floor summarization"""
        try:
            floor_file_path = os.path.join(output_dir, "floor", f"{floor_id}.json")
            floor_data = DataReader.read_json_file(floor_file_path)
            
            if not floor_data:
                return []
            
            rooms = []
            root = output_dir
            
            for design in floor_data['designs']:
                design_file_path = os.path.join(root, "design", f"{design}.json")
                design_data = DataReader.read_json_file(design_file_path)
                
                if design_data and 'rooms' in design_data:
                    for room_id in design_data['rooms']:
                        room_file_path = os.path.join(root, "room", f"{room_id}.json")
                        room_data = DataReader.read_json_file(room_file_path)
                        if room_data:
                            rooms.append(room_data)
            
            return rooms
            
        except Exception as e:
            print(f"Error getting rooms for floor {floor_id}: {e}")
            return []
    
    @staticmethod
    def get_floors_for_project(project_id, output_dir):
        """Get floor data for project summarization"""
        try:
            project_file_path = os.path.join(output_dir, "project", f"{project_id}.json")
            project_data = DataReader.read_json_file(project_file_path)
            
            if not project_data:
                return []
            
            floors = []
            root = output_dir
            
            for floor_id in project_data['floors']:
                floor_file_path = os.path.join(root, "floor", f"{floor_id}.json")
                floor_data = DataReader.read_json_file(floor_file_path)
                if floor_data:
                    floors.append(floor_data)
            
            return floors
            
        except Exception as e:
            print(f"Error getting floors for project {project_id}: {e}")
            return []
