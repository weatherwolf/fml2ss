import os
import subprocess

if __name__ == '__main__':
    p = subprocess.Popen([
        'node',
        os.path.abspath('./process_design.mjs'),
        '--project-id',
        '61301631',
        '--design-id',
        '115981800',
        '--outfile',
        'timtest/design.fml'
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    output, errors = p.communicate()
    print('output')
    print(output)
    print('errors')
    print(errors)