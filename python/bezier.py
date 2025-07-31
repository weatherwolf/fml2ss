import numpy as np

def quadratic_bezier_point(a, c, b, t):
    """
    Calculate a point on a quadratic Bézier curve.

    Args:
        a: Start point (numpy array)
        c: Control point (numpy array)
        b: End point (numpy array)
        t: Parameter value between 0 and 1

    Returns:
        numpy array: Point on the curve at parameter t
    """
    return (1-t)**2 * a + 2*(1-t)*t * c + t**2 * b

def adaptive_bezier_segments(a, c, b, min_segment_length, max_segments=100):
    """
    Divide a quadratic Bézier curve into adaptive line segments.

    Args:
        a: Start point (numpy array)
        c: Control point (numpy array)
        b: End point (numpy array)
        min_segment_length: Minimum length for each segment
        max_segments: Maximum number of segments to create

    Returns:
        list: List of points representing the segmented curve
    """
    points = [a]  # Start with the first point
    current_t = 0.0
    segment_count = 0

    while current_t < 1.0 and segment_count < max_segments:
        # Find the next t value that gives us a segment >= min_segment_length
        next_t = current_t
        step = 0.1  # Initial step size

        while next_t < 1.0:
            next_t = min(1.0, current_t + step)
            current_point = quadratic_bezier_point(a, c, b, current_t)
            next_point = quadratic_bezier_point(a, c, b, next_t)

            segment_length = np.linalg.norm(next_point - current_point)

            if segment_length >= min_segment_length or next_t >= 1.0:
                break

            step *= 2  # Increase step size if segment is too short

        # If we found a valid next point
        if next_t > current_t:
            next_point = quadratic_bezier_point(a, c, b, next_t)
            points.append(next_point)
            current_t = next_t
            segment_count += 1
        else:
            break

    # Ensure we end at the final point
    if np.linalg.norm(points[-1] - b) > 1e-6:
        points.append(b)

    return points