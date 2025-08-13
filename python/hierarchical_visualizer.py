import json
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict

# Import the room polygon creation function and related classes
from floorscript import create_room_polygon, Room, RoomWall

def create_room_from_json(room_data):
    """Convert JSON room data to Room dataclass object"""
    room = Room(id=room_data['id'], name=room_data.get('name', f"Room {room_data['id']}"))
    
    # Convert walls
    for wall_data in room_data['walls']:
        wall = RoomWall(
            id=wall_data['id'],
            a_x=wall_data['a_x'],
            a_y=wall_data['a_y'],
            a_z=wall_data.get('a_z', 0.0),
            b_x=wall_data['b_x'],
            b_y=wall_data['b_y'],
            b_z=wall_data.get('b_z', 0.0),
            height=wall_data.get('height', 0.0),
            thickness=wall_data.get('thickness', 0.0),
            openings=wall_data.get('openings', [])
        )
        room.walls.append(wall)
    
    return room

def load_hierarchical_data(filename='hierarchical.json'):
    """Load the hierarchical JSON data"""
    with open(filename, 'r') as f:
        return json.load(f)

def draw_grid(draw, width, height, scale, offset, min_pt, max_pt, font):
    """Draw a grid with coordinate labels"""
    # Calculate grid spacing based on scale
    # For smaller scales, use larger grid spacing
    if scale < 0.1:
        grid_spacing = 10.0  # 10 units
    elif scale < 0.5:
        grid_spacing = 5.0   # 5 units
    else:
        grid_spacing = 1.0   # 1 unit
    
    # Calculate the range of coordinates to show
    min_x = int(min_pt[0] // grid_spacing) * grid_spacing
    max_x = int(max_pt[0] // grid_spacing + 1) * grid_spacing
    min_y = int(min_pt[1] // grid_spacing) * grid_spacing
    max_y = int(max_pt[1] // grid_spacing + 1) * grid_spacing
    
    # Draw vertical grid lines
    for x in np.arange(min_x, max_x + grid_spacing, grid_spacing):
        # Convert to screen coordinates
        screen_x = int(x * scale + offset[0])
        if 0 <= screen_x <= width:
            # Draw grid line
            draw.line([(screen_x, 0), (screen_x, height)], fill=(200, 200, 200, 100), width=1)
            
            # Draw x-coordinate label at top
            if screen_x > 50:  # Avoid overlapping with title
                label = f"{x:.0f}"
                draw.text((screen_x, 40), label, fill=(100, 100, 100, 200), font=font, anchor="mm")
    
    # Draw horizontal grid lines
    for y in np.arange(min_y, max_y + grid_spacing, grid_spacing):
        # Convert to screen coordinates
        screen_y = int(y * scale + offset[1])
        if 0 <= screen_y <= height:
            # Draw grid line
            draw.line([(0, screen_y), (width, screen_y)], fill=(200, 200, 200, 100), width=1)
            
            # Draw y-coordinate label at left
            if screen_y > 80:  # Avoid overlapping with title and legend
                label = f"{y:.0f}"
                draw.text((20, screen_y), label, fill=(100, 100, 100, 200), font=font, anchor="mm")

def visualize_hierarchical_floor_plan(data, width=1920, height=1080):
    """Create a simple visualization of the hierarchical floor plan"""
    
    # Get the first floor and design
    if not data['floors']:
        print("No floors found in data")
        return
    
    floor = data['floors'][0]
    if not floor['designs']:
        print("No designs found in floor")
        return
    
    design = floor['designs'][0]
    
    # Collect all wall points for scaling
    all_points = []
    for room in design['rooms']:
        for wall in room['walls']:
            all_points.append([wall['a_x'], wall['a_y']])
            all_points.append([wall['b_x'], wall['b_y']])
    
    if not all_points:
        print("No walls found in design")
        return
    
    # Calculate bounds and scaling
    all_points = np.array(all_points)
    min_pt = np.min(all_points, axis=0)
    max_pt = np.max(all_points, axis=0)
    size = max_pt - min_pt
    
    # Scale to fit image
    vp = np.array([width, height])
    scale = min(vp / size) * 0.8  # 80% of available space
    
    center = (min_pt + size / 2) * scale
    offset = vp / 2 - center
    
    # Create image
    im = Image.new('RGBA', (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(im)
    
    # Try to load a font, fall back to default if not available
    try:
        font = ImageFont.truetype("arial.ttf", 14)  # Reduced from 16
        small_font = ImageFont.truetype("arial.ttf", 10)  # Reduced from 12
        tiny_font = ImageFont.truetype("arial.ttf", 8)  # New smaller font
    except:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()
        tiny_font = ImageFont.load_default()
    
    # Draw grid first (so it appears behind everything)
    draw_grid(draw, width, height, scale, offset, min_pt, max_pt, small_font)
    
    # Draw rooms with different colors
    room_colors = [
        (255, 200, 200, 180),  # Light red
        (200, 255, 200, 180),  # Light green
        (200, 200, 255, 180),  # Light blue
        (255, 255, 200, 180),  # Light yellow
        (255, 200, 255, 180),  # Light magenta
        (200, 255, 255, 180),  # Light cyan
        (255, 220, 180, 180),  # Light orange
        (220, 180, 255, 180),  # Light purple
    ]
    
    # Draw rooms
    for room_idx, room_data in enumerate(design['rooms']):
        if len(room_data['walls']) < 3:
            continue
            
        # Convert JSON data to Room dataclass object
        room = create_room_from_json(room_data)
        
        # Create room polygon using the function from floorscript.py
        polygon = create_room_polygon(room)
        
        # Convert polygon points to the format needed for visualization
        room_points = []
        for point in polygon:
            if isinstance(point, tuple):
                room_points.append([point[0], point[1]])
            else:
                room_points.append([point[0], point[1]])
        
        # Convert to numpy array for calculations
        room_points = np.array(room_points)
        
        # Scale and offset room points
        scaled_points = []
        for point in room_points:
            scaled_point = point * scale + offset
            scaled_points.append([int(scaled_point[0]), int(scaled_point[1])])
        
        # Draw room fill
        color = room_colors[room_idx % len(room_colors)]
        draw.polygon(scaled_points, fill=color, outline=(100, 100, 100, 255), width=2)
        
        # Calculate room center for label
        room_center = np.mean(room_points, axis=0) * scale + offset
        room_center = [int(room_center[0]), int(room_center[1])]
        
        # Draw room label
        label = f"Room {room_data['id']}\n{room_data.get('area', 0.0):.1f}m²"
        draw.text(room_center, label, fill=(0, 0, 0, 255), font=font, anchor="mm")
        
        # Draw walls with breaks for openings
        for wall in room_data['walls']:
            a = np.array([wall['a_x'], wall['a_y']]) * scale + offset
            b = np.array([wall['b_x'], wall['b_y']]) * scale + offset
            
            # Convert to integers
            a = [int(a[0]), int(a[1])]
            b = [int(b[0]), int(b[1])]
            
            # Check if wall has openings
            openings = wall.get('openings', [])
            if openings:
                # Draw wall in segments, breaking at openings
                wall_start = np.array([wall['a_x'], wall['a_y']])
                wall_end = np.array([wall['b_x'], wall['b_y']])
                wall_vector = wall_end - wall_start
                
                # Sort openings by their 't' parameter (position along wall)
                sorted_openings = sorted(openings, key=lambda x: x.get('t', 0.0))
                
                # Draw wall segments between openings
                last_t = 0.0
                for opening in sorted_openings:
                    t = opening.get('t', 0.0)
                    
                    # Draw wall segment from last position to this opening
                    if t > last_t:
                        seg_start = wall_start + last_t * wall_vector
                        seg_end = wall_start + t * wall_vector
                        
                        seg_start_scaled = seg_start * scale + offset
                        seg_end_scaled = seg_end * scale + offset
                        
                        seg_start_int = [int(seg_start_scaled[0]), int(seg_start_scaled[1])]
                        seg_end_int = [int(seg_end_scaled[0]), int(seg_end_scaled[1])]
                        
                        # Only draw if segment is long enough
                        if np.linalg.norm(np.array(seg_end_int) - np.array(seg_start_int)) > 5:
                            draw.line((seg_start_int, seg_end_int), fill=(0, 0, 0, 255), width=3)
                    
                    last_t = t
                
                # Draw final wall segment from last opening to wall end
                if last_t < 1.0:
                    seg_start = wall_start + last_t * wall_vector
                    seg_end = wall_end
                    
                    seg_start_scaled = seg_start * scale + offset
                    seg_end_scaled = seg_end * scale + offset
                    
                    seg_start_int = [int(seg_start_scaled[0]), int(seg_start_scaled[1])]
                    seg_end_int = [int(seg_end_scaled[0]), int(seg_end_scaled[1])]
                    
                    # Only draw if segment is long enough
                    if np.linalg.norm(np.array(seg_end_int) - np.array(seg_start_int)) > 5:
                        draw.line((seg_start_int, seg_end_int), fill=(0, 0, 0, 255), width=3)
            else:
                # No openings, draw wall as continuous line
                draw.line((a, b), fill=(0, 0, 0, 255), width=3)
            
            # Draw wall label
            wall_center = [(a[0] + b[0]) // 2, (a[1] + b[1]) // 2]
            draw.text(wall_center, f"W{wall['id']}", fill=(100, 100, 100, 255), font=tiny_font, anchor="mm")
            
            # Draw openings (doors and windows) on this wall
            for opening in wall.get('openings', []):
                # Calculate opening position along the wall using FML 't' parameter
                wall_start = np.array([wall['a_x'], wall['a_y']])
                wall_end = np.array([wall['b_x'], wall['b_y']])
                wall_vector = wall_end - wall_start
                wall_length = np.linalg.norm(wall_vector)
                
                # Use the 't' parameter (0.0 to 1.0) to position opening along wall
                # If 't' is not available, fall back to position_x/position_y
                if 't' in opening:
                    t = opening['t']
                    opening_pos = wall_start + t * wall_vector
                else:
                    # Fallback to absolute coordinates if 't' not available
                    opening_pos = np.array([opening['position_x'], opening['position_y']])
                
                # Calculate opening width in world coordinates
                opening_width_world = opening['width'] * 0.01  # Convert cm to m
                
                # Calculate the start and end points of the opening line along the wall
                # The opening should be centered at the opening position
                half_width = opening_width_world / 2
                
                # Calculate the opening line endpoints along the wall direction
                opening_start = opening_pos - (half_width / wall_length) * wall_vector
                opening_end = opening_pos + (half_width / wall_length) * wall_vector
                
                # Scale and offset the opening line endpoints
                opening_start_scaled = opening_start * scale + offset
                opening_end_scaled = opening_end * scale + offset
                
                # Convert to integers for drawing
                opening_start_int = [int(opening_start_scaled[0]), int(opening_start_scaled[1])]
                opening_end_int = [int(opening_end_scaled[0]), int(opening_end_scaled[1])]
                
                # Draw opening as a line with the same thickness as walls
                if opening['type'] == 'door':
                    # Draw door as a brown line
                    draw.line((opening_start_int, opening_end_int), fill=(139, 69, 19, 255), width=3)
                    # Draw door label at the center
                    opening_center = [(opening_start_int[0] + opening_end_int[0]) // 2, 
                                    (opening_start_int[1] + opening_end_int[1]) // 2]
                    draw.text(opening_center, "D", fill=(255, 255, 255, 255), font=tiny_font, anchor="mm")
                else:
                    # Draw window as a blue line
                    draw.line((opening_start_int, opening_end_int), fill=(135, 206, 235, 255), width=3)
                    # Draw window label at the center
                    opening_center = [(opening_start_int[0] + opening_end_int[0]) // 2, 
                                    (opening_start_int[1] + opening_end_int[1]) // 2]
                    draw.text(opening_center, "W", fill=(0, 0, 0, 255), font=tiny_font, anchor="mm")
    
    # Draw items
    for room in design['rooms']:
        for item in room['items']:
            pos = np.array([item['position_x'], item['position_y']]) * scale + offset
            
            # Calculate item dimensions in screen coordinates
            item_width = max(6, int(item['scale_x'] * scale))
            item_height = max(6, int(item['scale_y'] * scale))
            
            # Get item rotation angle (convert from radians to degrees if needed)
            angle = item.get('angle_z', 0.0)
            if isinstance(angle, (int, float)) and abs(angle) > 0.001:  # Only rotate if angle is significant
                # Calculate rectangle corners relative to center
                half_width = item_width // 2
                half_height = item_height // 2
                
                # Define corners relative to center (0,0)
                corners = [
                    [-half_width, -half_height],  # Top-left
                    [half_width, -half_height],   # Top-right
                    [half_width, half_height],    # Bottom-right
                    [-half_width, half_height]    # Bottom-left
                ]
                
                # Rotate corners around center
                cos_a = np.cos(angle)
                sin_a = np.sin(angle)
                
                rotated_corners = []
                for corner in corners:
                    x, y = corner
                    # Apply rotation matrix
                    new_x = x * cos_a - y * sin_a
                    new_y = x * sin_a + y * cos_a
                    # Translate to item position
                    rotated_corners.append([
                        int(pos[0] + new_x),
                        int(pos[1] + new_y)
                    ])
                
                # Draw rotated rectangle as polygon
                draw.polygon(rotated_corners, fill=(255, 0, 0, 200), outline=(150, 0, 0, 255))
            else:
                # No rotation needed, draw as simple rectangle
                rect_left = int(pos[0] - item_width // 2)
                rect_top = int(pos[1] - item_height // 2)
                rect_right = int(pos[0] + item_width // 2)
                rect_bottom = int(pos[1] + item_height // 2)
                
                draw.rectangle([
                    rect_left, rect_top,
                    rect_right, rect_bottom
                ], fill=(255, 0, 0, 200), outline=(150, 0, 0, 255), width=2)
            
            # Draw item label if it's not too small
            if item_width > 20 and item_height > 20:
                # Use smaller font and truncate long names
                label = item['class_name'][:8]  # Truncate to 8 characters
                draw.text(pos.tolist(), label, fill=(0, 0, 0, 255), font=tiny_font, anchor="mm")
    
    # Draw unassigned items
    for item in design.get('unassigned_items', []):
        pos = np.array([item['position_x'], item['position_y']]) * scale + offset
        
        # Calculate item dimensions in screen coordinates
        item_width = max(6, int(item['scale_x'] * scale))
        item_height = max(6, int(item['scale_y'] * scale))
        
        # Get item rotation angle
        angle = item.get('angle_z', 0.0)
        if isinstance(angle, (int, float)) and abs(angle) > 0.001:  # Only rotate if angle is significant
            # Calculate rectangle corners relative to center
            half_width = item_width // 2
            half_height = item_height // 2
            
            # Define corners relative to center (0,0)
            corners = [
                [-half_width, -half_height],  # Top-left
                [half_width, -half_height],   # Top-right
                [half_width, half_height],    # Bottom-right
                [-half_width, half_height]    # Bottom-left
            ]
            
            # Rotate corners around center
            cos_a = np.cos(angle)
            sin_a = np.sin(angle)
            
            rotated_corners = []
            for corner in corners:
                x, y = corner
                # Apply rotation matrix
                new_x = x * cos_a - y * sin_a
                new_y = x * sin_a + y * cos_a
                # Translate to item position
                rotated_corners.append([
                    int(pos[0] + new_x),
                    int(pos[1] + new_y)
                ])
            
            # Draw rotated rectangle as polygon
            draw.polygon(rotated_corners, fill=(0, 0, 255, 150), outline=(0, 0, 150, 255))
        else:
            # No rotation needed, draw as simple rectangle
            rect_left = int(pos[0] - item_width // 2)
            rect_top = int(pos[1] - item_height // 2)
            rect_right = int(pos[0] + item_width // 2)
            rect_bottom = int(pos[1] + item_height // 2)
            
            draw.rectangle([
                rect_left, rect_top,
                rect_right, rect_bottom
            ], fill=(0, 0, 255, 150), outline=(0, 0, 150, 255), width=2)
    
    # Draw unassigned walls and their openings
    for wall in design.get('unassigned_walls', []):
        a = np.array([wall['a_x'], wall['a_y']]) * scale + offset
        b = np.array([wall['b_x'], wall['b_y']]) * scale + offset
        
        # Convert to integers
        a = [int(a[0]), int(a[1])]
        b = [int(b[0]), int(b[1])]
        
        # Check if wall has openings
        openings = wall.get('openings', [])
        if openings:
            # Draw wall in segments, breaking at openings
            wall_start = np.array([wall['a_x'], wall['a_y']])
            wall_end = np.array([wall['b_x'], wall['b_y']])
            wall_vector = wall_end - wall_start
            
            # Sort openings by their 't' parameter (position along wall)
            sorted_openings = sorted(openings, key=lambda x: x.get('t', 0.0))
            
            # Draw wall segments between openings
            last_t = 0.0
            for opening in sorted_openings:
                t = opening.get('t', 0.0)
                
                # Draw wall segment from last position to this opening
                if t > last_t:
                    seg_start = wall_start + last_t * wall_vector
                    seg_end = wall_start + t * wall_vector
                    
                    seg_start_scaled = seg_start * scale + offset
                    seg_end_scaled = seg_end * scale + offset
                    
                    seg_start_int = [int(seg_start_scaled[0]), int(seg_start_scaled[1])]
                    seg_end_int = [int(seg_end_scaled[0]), int(seg_end_scaled[1])]
                    
                    # Only draw if segment is long enough
                    if np.linalg.norm(np.array(seg_end_int) - np.array(seg_start_int)) > 5:
                        draw.line((seg_start_int, seg_end_int), fill=(128, 128, 128, 255), width=2)
                
                last_t = t
            
            # Draw final wall segment from last opening to wall end
            if last_t < 1.0:
                seg_start = wall_start + last_t * wall_vector
                seg_end = wall_end
                
                seg_start_scaled = seg_start * scale + offset
                seg_end_scaled = seg_end * scale + offset
                
                seg_start_int = [int(seg_start_scaled[0]), int(seg_start_scaled[1])]
                seg_end_int = [int(seg_end_scaled[0]), int(seg_end_scaled[1])]
                
                # Only draw if segment is long enough
                if np.linalg.norm(np.array(seg_end_int) - np.array(seg_start_int)) > 5:
                    draw.line((seg_start_int, seg_end_int), fill=(128, 128, 128, 255), width=2)
        else:
            # No openings, draw wall as continuous line
            draw.line((a, b), fill=(128, 128, 128, 255), width=2)
    
    # Draw title
    title = f"Floor Plan: {data['name']} - {floor['name']}"
    draw.text((20, 20), title, fill=(0, 0, 0, 255), font=font)
    
    # Draw coordinate info
    coord_info = f"Scale: {scale:.3f} | Grid spacing: {get_grid_spacing(scale):.1f} units"
    draw.text((20, 45), coord_info, fill=(100, 100, 100, 255), font=small_font)
    
    # Draw legend
    legend_y = 80
    draw.text((20, legend_y), "Legend:", fill=(0, 0, 0, 255), font=font)
    legend_y += 25
    
    # Room legend
    draw.rectangle([20, legend_y, 40, legend_y + 20], fill=(255, 200, 200, 180), outline=(100, 100, 100, 255))
    draw.text((50, legend_y), "Rooms (colored areas)", fill=(0, 0, 0, 255), font=small_font)
    legend_y += 25
    
    # Items legend
    draw.ellipse([20, legend_y, 36, legend_y + 16], fill=(255, 0, 0, 200), outline=(150, 0, 0, 255))
    draw.text((50, legend_y), "Items in rooms", fill=(0, 0, 0, 255), font=small_font)
    legend_y += 25
    
    # Unassigned items legend
    points = [[20, legend_y], [16, legend_y + 16], [24, legend_y + 16]]
    draw.polygon(points, fill=(0, 0, 255, 150), outline=(0, 0, 150, 255))
    draw.text((50, legend_y), "Unassigned items", fill=(0, 0, 0, 255), font=small_font)
    legend_y += 25
    
    # Doors legend
    draw.rectangle([20, legend_y, 36, legend_y + 16], fill=(139, 69, 19, 200), outline=(101, 67, 33, 255))
    draw.text((50, legend_y), "Doors (D)", fill=(0, 0, 0, 255), font=small_font)
    legend_y += 25
    
    # Windows legend
    draw.rectangle([20, legend_y, 36, legend_y + 16], fill=(173, 216, 230, 200), outline=(135, 206, 235, 255))
    draw.text((50, legend_y), "Windows (W)", fill=(0, 0, 0, 255), font=small_font)
    legend_y += 25
    
    # Unassigned walls legend
    draw.line([20, legend_y + 8, 36, legend_y + 8], fill=(128, 128, 128, 255), width=2)
    draw.text((50, legend_y), "Unassigned walls", fill=(0, 0, 0, 255), font=small_font)
    legend_y += 25
    
    # Grid legend
    draw.line([20, legend_y + 8, 36, legend_y + 8], fill=(200, 200, 200, 100), width=1)
    draw.text((50, legend_y), "Grid lines", fill=(0, 0, 0, 255), font=small_font)
    
    return im

def get_grid_spacing(scale):
    """Helper function to determine grid spacing based on scale"""
    if scale < 0.1:
        return 10.0
    elif scale < 0.5:
        return 5.0
    else:
        return 1.0

def main():
    """Main function to run the visualizer"""
    try:
        # Load data
        data = load_hierarchical_data()
        
        # Create visualization
        im = visualize_hierarchical_floor_plan(data)
        
        if im:
            # Save image
            im.save('hierarchical_floor_plan.png')
            print("Floor plan saved as 'hierarchical_floor_plan.png'")
            
            # Show image
            im.show()
        else:
            print("Failed to create visualization")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
