import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import { mkdirp } from 'mkdirp';
import { processDesign } from './index.mjs';

const fp_headers = {Authorization: `Basic ${Buffer.from(process.env.FP_API_KEY + ':x').toString('base64')}`}

async function loadProject (id) {
    return (await fetch(`https://floorplanner.com/api/v2/projects/${id}/fml`, {
        method: 'GET',
        headers: {...fp_headers, 'Content-Type': 'application/json'}
    })).json();
}

async function execute ({projectId, designId, outfile}) {
    if (outfile) {
        mkdirp.sync(path.dirname(outfile));
    }
    const project = await loadProject(projectId);
    const design = project.floors.reduce((design, floor) => {
        const d = floor.designs.find(design => `${design.id}` === `${designId}`);
        return d ? d : design;
    }, null);
    if (design) {
        const result = await processDesign(design, project.settings);
        if (outfile) {
            fs.writeFileSync(outfile, JSON.stringify(result, null, 2));
        }
        console.log(JSON.stringify(result, null, 2))
    } else {
        console.error(`project ${projectId} does not have a design wiht id ${designId}`);
        process.exit(1);
    }
}

program
    .requiredOption('--project-id <int>', 'project id', parseInt)
    .requiredOption('--design-id <int>', 'design id', parseInt)
    .option('--outfile <str>', 'doutput file');
program.parse(process.argv);

execute(program.opts());