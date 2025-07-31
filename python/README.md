### fml2screenscript

Converts a project FML file to screenscript.

The `fml2screenscript.py` file exposes a method `make_project`  which returns a dictionary two keys:

1.  `fml` - the project fml
2.  `screenscript` - dictionary with the design IDs as key and the screenscript commands as value.

#### environment variables

1.  `FP_API_KEY` - Your floorplanner API key

#### example

```python
from fml2screenscript import make_project

snap_value = None # for example 0.01 to snap to 1 cm
decimals = 2 # number of decimals

result = make_project(61301631, snap_value, decimals)

for design_id, design in result['screenscript'].items():
    print(design_id)
    print(design)
    print('-' * 100)

```