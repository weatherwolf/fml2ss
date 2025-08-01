import numpy as np
import math
from functools import reduce
from utils import Vertex, Wall, parse_command_line, load_screenscript_file

def left_bottom_vertex(vertices):
    return reduce(lambda m, v: v if v.position[0] < m.position[0] else m if v.position[0] > m.position[0] else m if v.position[1] < m.position[1] else v, vertices)

def reduce_walk(w):
    for i in range(1, len(w)):
        idup = w.index(w[i])
        if idup > i:
            w = w[:i+1] + w[idup:]
    return w

def closed_walk_from(v):
    walk = []
    curr = v
    prev = None
    walk.append(curr)
    curr, prev = get_next(curr, prev)
    while curr != v:
        walk.append(curr)
        curr, prev = get_next(curr, prev)
    return walk

def get_next(v, prev):
    next = v.adj[0] if len(v.adj) == 1 else best_by_kind(prev, v, prev is not None and 'ccw' or 'cw')
    return next, v

def best_by_kind(v_prev, v_curr, kind):
    d_curr = None
    adj = v_curr.adj
    if v_prev:
        d_curr = v_curr.position - v_prev.position
        adj = [v for v in adj if v != v_prev]
    else:
        d_curr = np.array([0, -1])
    return reduce(lambda v_so_far, v: better_by_kind(v, v_so_far, v_curr, d_curr, kind), adj)

def dot_perp(a, b):
    return a[0] * b[1] - a[1] * b[0]

def vsub(a, b):
    return np.array([a[0] - b[0], a[1] - b[1]])

def better_by_kind(v, v_so_far, v_curr, d_curr, kind):
    d = v.position - v_curr.position
    d_so_far = v_so_far.position - v_curr.position
    is_convex = dot_perp(d_so_far, d_curr) > 0
    curr2v = dot_perp(d_curr, d)
    vsf2v = dot_perp(d_so_far, d)
    if kind == 'cw':
        v_is_better = (is_convex and (curr2v >= 0 or vsf2v >= 0)) or (not is_convex and curr2v >= 0 and vsf2v >= 0)
    else:
        v_is_better = (not is_convex and (curr2v < 0 or vsf2v < 0)) or (is_convex and curr2v < 0 and vsf2v < 0)
    return v if v_is_better else v_so_far

def remove_edge(v1, v2):
    v1.adj = [v for v in v1.adj if v != v2]
    v2.adj = [v for v in v2.adj if v != v1]

def without_vertex(v, vertices):
    return [vi for vi in vertices if vi != v]

def remove_filament_at(v, vertices):
    current = v
    next = None
    while current and len(current.adj) < 2:
        vertices = without_vertex(current, vertices)
        next = current.adj[0] if len(current.adj) > 0 else None
        if next:
            remove_edge(current, next)
        current = next
    return vertices

def extract_cycles(vertices):
    cycles = []
    while len(vertices) > 0:
        v = left_bottom_vertex(vertices)
        walk = reduce_walk(closed_walk_from(v))
        if len(walk) > 2:
            cycles.append(walk);
        remove_edge(walk[0], walk[1])
        vertices = remove_filament_at(walk[0], vertices)
        vertices = remove_filament_at(walk[1], vertices)
    return cycles

def extract_rooms_from_screenscript(wall_data):
    walls = [Wall(parse_command_line(wall_data)) for wall_data in wall_data]
    vertices = []
    edges = []

    for wall in walls:
        if wall.a not in vertices:
            vertices.append(wall.a)
        if wall.b not in vertices:
            vertices.append(wall.b)

    for wall in walls:
        edges.append([vertices.index(wall.a), vertices.index(wall.b)])

    for a,b in edges:
        vertices[a].adj.append(vertices[b])
        vertices[b].adj.append(vertices[a])

    cycles = extract_cycles(vertices)

    def find_wall(a, b):
        for wall in walls:
            if (wall.a == a and wall.b == b) or (wall.a == b and wall.b == a):
                return wall.id
        return None

    commands = []
    for cid, c in enumerate(cycles):
        wall_ids = []
        for i,a in enumerate(c):
            b = c[(i+1) % len(c)]
            wall_ids.append(int(find_wall(a, b)))
        commands.append('make_room, id=%s, wall_ids=%s' % (cid+9000, '-'.join(map(str, wall_ids))))

    return commands

if __name__ == "__main__":
    import json
    wall_data = load_screenscript_file('../demo-project.screenscript')

    walls = [Wall(wall_data) for wall_data in wall_data]

    vertices = []

    for wall in walls:
        if wall.a not in vertices:
            vertices.append(wall.a)
        if wall.b not in vertices:
            vertices.append(wall.b)

    for wall in walls:
        wall.a = vertices[vertices.index(wall.a)]
        wall.b = vertices[vertices.index(wall.b)]
        if not wall.b in wall.a.adj:
            wall.a.adj.append(wall.b)
        if not wall.a in wall.b.adj:
            wall.b.adj.append(wall.a)

    vs = []
    edges = []
    for wall in walls:
        edges.append([vertices.index(wall.a), vertices.index(wall.b)])

    for v in vertices:
        vs.append({
            'x': float(v.position[0]),
            'y': float(v.position[1]),
            'adj': []
        })

    data = {
        'vertices': vs,
        'edges': edges
    }
    with open('data.json', 'w') as f:
        json.dump(data, f, indent=2)


    for v in vertices:
        v.adj = []

    for a,b in edges:
        vertices[a].adj.append(vertices[b])
        vertices[b].adj.append(vertices[a])

    cycles = extract_cycles(vertices)
    print(len(cycles))
    for c in cycles:
        print(len(c))
