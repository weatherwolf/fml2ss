import assert from 'assert';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fpe from '@floorplanner/fp.engine.new';

global.window = global.window || {};

const client = new S3Client({region: 'eu-west-1'});

async function loadFml(Key) {
    const {Body} = await client.send(
        new GetObjectCommand({
            Bucket: process.env.fml_bucket,
            Key,
        })
    );
    return JSON.parse(await streamToString(Body));
}

function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

async function processDesign (design, projectSettings) {
    const settings = {...fpe.defaults, ...projectSettings, ...design.settings};

    const floorplan = new fpe.Floorplan(settings);

    floorplan.importFloorplan(design);

    floorplan.state = floorplan.state.asMutable({deep: true});

    await fpe.io.setAssets(floorplan.state)

    floorplan.state.walls = floorplan.state.walls.map((wall, i) => {
        wall.id = i;
        return wall;
    });

    const findWall = (a, b) => {
        return floorplan.state.walls.find(
            (w) => fpe.util.arePointsEqual(w.left.a, a) && fpe.util.arePointsEqual(w.left.b, b) ||
                   fpe.util.arePointsEqual(w.left.a, b) && fpe.util.arePointsEqual(w.left.b, a) ||
                   fpe.util.arePointsEqual(w.right.a, a) && fpe.util.arePointsEqual(w.right.b, b) ||
                   fpe.util.arePointsEqual(w.right.a, b) && fpe.util.arePointsEqual(w.right.b, a)
        );
    };
    for (const area of floorplan.state.areas) {
        area.walls = [];
        for (let i = 0; i < area.poly.length; i++) {
            const j = (i+1) % area.poly.length;

            const p1 = area.poly[i];
            const p2 = area.poly[j];

            const wall = findWall(p1, p2);

            assert(wall)

            area.walls.push(wall.id);
        }

        area.polygonArea = fpe.math.polygonArea(area.poly);

        console.log(area)
    }

    return floorplan.state;
}

async function loadDesign (projectId, designId) {

    const design = await loadFml(`${projectId}/${designId}`);

    assert(design, `Design with id ${designId} not found in project ${projectId}`);

    return processDesign(design, {});
}

export async function handler(event) {
    const projectId = event.queryStringParameters.projectId;
    const designId = event.queryStringParameters.designId;

    if (!projectId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing projectId' }),
        };
    }

    if (!designId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing designId' }),
        };
    }

    console.log('Testing design:', `${projectId}/${designId}`);
    try {
        const design = await loadDesign(projectId, designId);
        return {
            statusCode: 200,
            body: JSON.stringify(design),
        };
    } catch (error) {
        console.error('Error during test:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
}

(async () => {
    const projectId = 61301631; // Replace with your project ID
    const designId = 115981800; // Replace with your design ID

    const fml = await loadDesign(projectId, designId);

    for (const wall of fml.walls) {
        console.log(wall.id);
    }
})()
