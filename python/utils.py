import numpy as np

class Vertex:
    """ Helper vertex class for walls and area detection """
    def __init__(self, x, y):
        self.position = np.array([x, y])
        self.adj = []

    def equal(self, other, tolerance=0.1):
        return np.linalg.norm(self.position - other.position) < tolerance

    def __eq__(self, other):
        return self.equal(other)

class Wall:
    """ Helper wall class for walls and area detection """
    def __init__(self, wall_data):
        self.data = wall_data
        self.id = wall_data['id']
        self.a = Vertex(wall_data['a_x'], wall_data['a_y'])
        self.b = Vertex(wall_data['b_x'], wall_data['b_y'])
        self.center = (self.a.position + self.b.position) / 2
        self.normal = np.array([-self.b.position[1] + self.a.position[1], self.b.position[0] - self.a.position[0]])
        self.normal = self.normal / np.linalg.norm(self.normal)
        self.direction = self.b.position - self.a.position
        self.direction = self.direction / np.linalg.norm(self.direction)

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

def load_screenscript_file(filename):
    """
    Load and parse a Scenescript file, extracting all make_wall commands.

    Args:
        filename (str): Path to the Scenescript file

    Returns:
        list: List of wall dictionaries
    """
    walls = []

    with open(filename, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('make_wall,'):
                wall_data = parse_command_line(line)
                walls.append(wall_data)

    return walls