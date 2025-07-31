import re
from fml2screenscript import make_project
from PIL import Image, ImageDraw
import numpy as np

def parse_command_line(line):
    """
    Parse a command line like "make_wall, id=26, a_x=-8.26, a_y=4.26, a_z=0.0, b_x=-8.27, b_y=2.02, b_z=0.0, heigth=2.8, thickness=0.3"
    into a dictionary.
    
    Args:
        line (str): The command line to parse
        
    Returns:
        dict: Dictionary with 'command' key and other key-value pairs
    """
    # Split by comma and strip whitespace
    parts = [part.strip() for part in line.split(',')]
    
    # First part is the command
    command = parts[0]
    
    # Create dictionary starting with command
    result = {'command': command}
    
    # Parse the rest as key=value pairs
    for part in parts[1:]:
        if '=' in part:
            key, value = part.split('=', 1)
            key = key.strip()
            value = value.strip()
            
            # Try to convert value to appropriate type
            try:
                # Try to convert to float first
                if '.' in value or value.replace('-', '').replace('.', '').isdigit():
                    result[key] = float(value)
                # Then try int
                elif value.replace('-', '').isdigit():
                    result[key] = int(value)
                # Otherwise keep as string
                else:
                    result[key] = value
            except ValueError:
                result[key] = value
    
    return result

def visualize_design(design, width=1920, height=1080):

    lines = re.split('[\r\n]', design)
    commands = [parse_command_line(line) for line in lines]
    wall_commands = [cmd for cmd in commands if cmd['command'] == 'make_wall']
    door_commands = [cmd for cmd in commands if cmd['command'] == 'make_door']
    window_commands = [cmd for cmd in commands if cmd['command'] == 'make_window']
    wall_pts = [np.array([cmd['a_x'], cmd['a_y']]) for cmd in wall_commands] + \
        [np.array([cmd['b_x'], cmd['b_y']]) for cmd in wall_commands]

    min_pt = np.min(wall_pts, axis=0)
    max_pt = np.max(wall_pts, axis=0)
    size = max_pt - min_pt

    vp = np.array([width, height])
    scale = min(vp / size) * 0.9

    center = (min_pt + size / 2) * scale
    offset = vp / 2 - center
    im = Image.new('RGBA', (width, height), (0, 0, 0, 255)) 
    draw = ImageDraw.Draw(im) 

    for cmd in wall_commands:
        a = np.array([cmd['a_x'], cmd['a_y']]) * scale + offset
        b = np.array([cmd['b_x'], cmd['b_y']]) * scale + offset
        draw.line((a.tolist(), b.tolist()), fill=(255, 0, 0, 255), width=int(cmd['thickness'] * scale))

    def draw_opening(cmd):
        wall = wall_commands[int(cmd['wall0_id'])]
        a = np.array([wall['a_x'], wall['a_y']])
        b = np.array([wall['b_x'], wall['b_y']])
        ba = b - a
        dir = ba / np.linalg.norm(ba)
        normal = np.array([-dir[1], dir[0]])
        width = cmd['width'] 
        center = np.array([cmd['position_x'], cmd['position_y']]) 
        left = center - dir * width / 2
        right = center + dir * width / 2
        left = left * scale + offset
        right = right * scale + offset
        th = int(wall['thickness'] * scale)
        draw.line((left.tolist(), right.tolist()), fill=(255, 255, 0, 255), width=th)
        #draw.text(left.tolist(), 'door-%d' % cmd['id'], fill=(255, 255, 255, 255), font_size=20, anchor='la')

    for cmd in door_commands:
        draw_opening(cmd)
        a = np.array([cmd['position_x'], cmd['position_y']]) * scale + offset
        draw.circle(a.tolist(), fill=(0, 255, 0, 255), radius=10)
        draw.text(a.tolist(), 'door-%d' % cmd['id'], fill=(255, 255, 255, 255), font_size=20, anchor='la')
    for cmd in window_commands:
        draw_opening(cmd)
        a = np.array([cmd['position_x'], cmd['position_y']]) * scale + offset
        draw.circle(a.tolist(), fill=(0, 0, 255, 255), radius=10)
        draw.text(a.tolist(), 'window-%d' % cmd['id'], fill=(255, 255, 255, 255), font_size=20, anchor='la')

    im.show()

designs = make_project(61301631, None, 2)

for design_id, design in designs['screenscript'].items():
    visualize_design(design)
    break