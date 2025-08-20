import os
import subprocess
import json
import re

def get_design_from_output(output):
    for r in re.split('[\r\n]', output):
        try:
            return json.loads(r)
        except:
           pass

if __name__ == '__main__':
    p = subprocess.Popen([
        'node',
        os.path.abspath('./process_design.mjs'),
        '--project-id',
        '61301631',
        '--design-id',
        '115981800',
        #'--outfile',
        #'tim/design.fml'
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    output, errors = p.communicate()
    print('output')
    enhanced_design_fml = get_design_from_output(output)
    print('#areas: %d' % len(enhanced_design_fml['areas']))
    print('#walls: %d' % len(enhanced_design_fml['walls']))
    print('errors')
    print(errors)