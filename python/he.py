import numpy as np
import math

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

class HalfEdge:
    def __init__(self, wall, is_twin=False):
        self.wall = wall
        if is_twin:
            self.start_point = np.array([wall['b_x'], wall['b_y']])
            self.end_point = np.array([wall['a_x'], wall['a_y']])
        else:
            self.start_point = np.array([wall['a_x'], wall['a_y']])
            self.end_point = np.array([wall['b_x'], wall['b_y']])
        self.twin = None
        self.angle = 0
        self.direction = unit_vector(self.end_point - self.start_point)
        self.normal = np.array([-self.direction[1], self.direction[0]])
        self.center = (self.start_point + self.end_point) / 2

def equal_points(p1, p2, tolerance=0.1):
    return np.linalg.norm(p1 - p2) < tolerance

def create_half_edges(walls):
    half_edges = []
    for wall in walls:
        he1 = HalfEdge(wall)
        he2 = HalfEdge(wall, is_twin=True)
        he1.twin = he2
        he2.twin = he1
        half_edges.append(he1)
        half_edges.append(he2)
    return half_edges

def find_candidate_half_edges(hea, half_edges):
    candidates = []
    for heb in half_edges:
        if hea == heb or hea.twin == heb or heb.twin == hea:
            continue
        if equal_points(hea.end_point, heb.start_point):
            v1 = hea.start_point - hea.end_point
            v2 = heb.end_point - heb.start_point
            heb.angle = angle_between(v1, v2)
            candidates.append(heb)
    return sorted(candidates, key=lambda x: x.angle)

def unit_vector(vector):
    """ Returns the unit vector of the vector.  """
    return vector / np.linalg.norm(vector)

def angle_between(v1, v2):
    """ Returns the angle in radians between vectors 'v1' and 'v2' in range 0 to 2π
    """
    v1_u = unit_vector(v1)
    v2_u = unit_vector(v2)

    # Calculate the angle using arccos (0 to π)
    angle = np.arccos(np.clip(np.dot(v1_u, v2_u), -1.0, 1.0))

    # Use cross product to determine if we need to add 2π
    # Cross product gives us the sign of the angle
    cross_product = np.cross(v1_u, v2_u)

    # If cross product is negative, the angle should be 2π - angle
    if cross_product < 0:
        angle = 2 * np.pi - angle

    return angle

def point_in_polygon(point, polygon_vertices):
    """
    Determine if a point is inside a polygon using the ray casting algorithm.

    Args:
        point (numpy array): The point to test [x, y]
        polygon_vertices (list): List of polygon vertices as numpy arrays [[x1, y1], [x2, y2], ...]

    Returns:
        bool: True if point is inside polygon, False otherwise
    """
    if len(polygon_vertices) < 3:
        return False

    x, y = point
    n = len(polygon_vertices)
    inside = False

    # Ray casting algorithm
    j = n - 1
    for i in range(n):
        xi, yi = polygon_vertices[i]
        xj, yj = polygon_vertices[j]

        # Check if point is on the same side of the edge
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i

    return inside

def polygon_vertices_from_cycle(cycle):
    """
    Extract polygon vertices from a cycle of half-edges.

    Args:
        cycle (list): List of HalfEdge objects forming a closed cycle

    Returns:
        list: List of polygon vertices as numpy arrays
    """
    vertices = []

    for he in cycle:
        vertices.append(he.start_point)

    return vertices

def point_in_cycle(point, cycle):
    """
    Determine if a point is inside a cycle of half-edges (polygon).

    Args:
        point (numpy array): The point to test [x, y]
        cycle (list): List of HalfEdge objects forming a closed cycle

    Returns:
        bool: True if point is inside the cycle, False otherwise
    """
    vertices = polygon_vertices_from_cycle(cycle)
    return point_in_polygon(point, vertices)

def polygon_centroid(vertices):
    """
    Calculate the centroid (geometric center) of a polygon.

    Args:
        vertices (list): List of polygon vertices as numpy arrays [[x1, y1], [x2, y2], ...]

    Returns:
        numpy array: Centroid point [x, y]
    """
    if len(vertices) < 3:
        return None

    n = len(vertices)
    area = 0.0
    centroid_x = 0.0
    centroid_y = 0.0

    # Calculate centroid using the shoelace formula
    for i in range(n):
        j = (i + 1) % n
        xi, yi = vertices[i]
        xj, yj = vertices[j]

        # Cross product for area calculation
        cross_product = xi * yj - xj * yi

        area += cross_product
        centroid_x += (xi + xj) * cross_product
        centroid_y += (yi + yj) * cross_product

    # Final calculations
    area *= 0.5
    if abs(area) < 1e-10:  # Handle degenerate polygons
        return None

    centroid_x /= (6.0 * area)
    centroid_y /= (6.0 * area)

    return np.array([centroid_x, centroid_y])

def cycle_centroid(cycle):
    """
    Calculate the centroid of a cycle of half-edges (polygon).

    Args:
        cycle (list): List of HalfEdge objects forming a closed cycle

    Returns:
        numpy array: Centroid point [x, y] or None if invalid
    """
    vertices = polygon_vertices_from_cycle(cycle)
    return polygon_centroid(vertices)

def find_cycles(walls):
    half_edges = create_half_edges(walls)
    hea = half_edges.pop()
    cycle = [hea]
    cycles = []
    while len(half_edges) > 0:
        candidates = find_candidate_half_edges(hea, half_edges)
        print('----------------')
        if len(candidates) == 0:
            print('no candidates')
            for he in cycle:
                print('%d' %he.wall['id'])
            break
        hea = candidates[0]
        cycle.append(hea)
        half_edges.remove(hea)
        if equal_points(hea.end_point, cycle[0].start_point):
            print('cycle found', len(cycle))
            for he in cycle:
                print('%d' %he.wall['id'])
            cycles.append(cycle)
            cycle = []
            if len(half_edges) > 0:
                hea = half_edges.pop()
                cycle = [hea]
            else:
                #cycle.clear()
                print('no more half edges', len(cycle))
                if len(cycle) > 2:
                    cycles.append(cycle)
                break

    return cycles

if __name__ == "__main__":
    walls = load_screenscript_file('../demo-project.screenscript')
    cycles = find_cycles(walls)

    print('found %d cycles' % len(cycles))

    for i, cycle in enumerate(cycles):
        print('cycle #%d' % (i+1))
        for he in cycle:
            p = he.center + he.normal * 0.5
            inside = point_in_cycle(p, cycle)
            print('%d' %he.wall['id'], inside, he.direction, he.normal)
        print('--------------------------------')