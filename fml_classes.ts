export interface Project {
    id: number;
    name: string;
    public: boolean;
    settings?: ProjectSettings;
    floors: Floor[];
}

export interface ProjectSettings {
    wallHeight: number;
    wallSectionHeight: number;
    wallThickness: number;
    wallOuterThickness: number;
    useMetric: boolean;
    showGrid: boolean;
    showDims: boolean;
    showShortDims: boolean;
    showAreaDims: boolean;
    generateOuterDimension: boolean;
    showDropShadows: boolean;
    showObjects: boolean;
    showFixtures: boolean;
    showItemOutline: boolean;
    showObjectColour: boolean;
    showStructuralColour: boolean;
    showFloorsBelow: boolean;
    showObjects3d: boolean;
    showObjectMono: boolean;
    showLights: boolean;
    useSection3D: boolean;
    showLabels: boolean;
    areaLabelOutline: boolean;
    areaLabelLetterSpacing: number;
    dimLineLabelHorizontal: boolean;
    exportLabels3D: boolean;
    showShadows3D: boolean;
    exportOrtho3D: boolean;
    visuals: "ALL" | "BW" | "BWC";
    showTexts: boolean;
    arrowHeadType: "arrow-stop" | "stop" | "reverse-arrow-stop" | "arrow";
    northArrowRotation: number;
    northArrowKind: number;
    blueprintMode: boolean;
    dimLineFont: string;
    hideItemsAboveHeight: number;
    hideItemsAbove: boolean;
}

export interface Floor {
    id: number;
    name: string;
    level: number;
    height: number; // default wall height
    designs: Floorplan[];
    cameras: Camera[];
    drawing?: Drawing
}

export interface Drawing {
    x: number;				// position of the drawing on the plan
    y: number;
    width: number;			// size of the drawing in cm
    height: number;
    visible: boolean;
    url: string;
    rotation: number;		// in degrees
    alpha: number;
    depth?: "LOW" | "HIGH"	// drawn above or below the floorplan
}

export interface Camera {
    id: number;
    name: string;
    type_name: 'orbital' | 'walkthrough';
    x: number;		// position
    y: number;
    z: number;
    ux: number;		// direction of normals
    uy: number;
    uz: number;
    dx: number;		// direction of camera
    dy: number;
    dz: number;
    fov: number;	// field of view, in degrees
    lightSettings: CameraLightSettings;
    background_image: PresetSky | UserDefinedSky | {}
}

export interface CameraLightSettings {
    altitude: number;
    azimuth: number;
    day: boolean;
    intensity: number;
    profile: boolean;
}

export interface PresetSky {
    sky_id: number;
    url: string;
    type_name: 'sphere'
}

export interface UserDefinedSky {
    url: string;
    type_name: 'plane'
}

export interface Floorplan {
    id: number;
    name: string;
    walls: Wall[];
    areas: Area[];
    surfaces: Surface[];
    dimensions: Dimension[];
    items: Item[];
    labels: Label[];
    lines: Line[];
    settings?: DesignSettings;
}

export interface Point {
    x: number;
    y: number;
}

export interface Point3D extends Point {
    z: number;
}

type Color = string;

export interface GenericLine {
    a: Point;
    b: Point;
}

export interface Wall extends GenericLine {
    c?: Point | null; // control point for curved walls (quadratic bezier)
    az: Endpoint3D;
    bz: Endpoint3D;
    thickness: number; // in cm
    balance: number; // 0..1
    openings: GenericOpening[];
    decor: WallDecor;
};

export interface Endpoint3D {
    z: number; // elevation of the bottom of the wall's endpoint
    h: number; // elevation of the top of the wall's endpoint
}

export interface GenericOpening {
    refid: string;
    width: number;
    z: number; // elevation
    z_height: number; // height
    t: number; // 0..1 - relative position of the opening on the wall
    frameColor?: Color;
}

export interface Door extends GenericOpening {
    type: 'door';
    mirrored: [0 | 1, 0 | 1]; // vertical and horizontal flipping
    doorColor?: Color;
}

export interface Window extends GenericOpening {
    type: 'window'
}

export interface WallDecor {
    left: WallSideDecor;
    right: WallSideDecor;
}

type WallSideDecor = null | WallSideWithColor | WallSideWithMaterial | WallSideWithTexture;

export interface WallSideWithColor {
    color: Color;
}

export interface WallSideWithMaterial {
    refid: string;
}

export interface WallSideWithTexture {
    texture: WallTexture;
}

export interface WallTexture {
    src: string;	// url to the image
    fit: 'free' | 'no-stretch' | 'fill' | 'contain' | 'tile-horizontally' | 'tile-vertically' | 'tile-both';
    tlx: number;	// top left corner coordinates on the wall side
    tly: number;
    brx: number;	// bottom right corner coordinates on the wall side
    bry: number;
}

export interface TextureProps {
    rotation?: number; // rotation of the texture, in degrees, if a texture applied and rotation is not zero
    tx?: number; // horizontal texture offset, in pixels, if a texture is applied and if the offset is not zero
    ty?: number; // vertical texture offset, in pixels, if a texture is applied and if the offset is not zero
    sx?: number; // horizontal texture scale, in %, if a texture is applied and scale is not 100%
    sy?: number; // vertical texture scale, in %, if a texture is applied and scale is not 100%
}

export interface AreaProps extends TextureProps {
    refid?: string;
    color: Color;
    showSurfaceArea?: boolean;
    showAreaLabel: boolean;

    name?: string;			// standard name, derived from the applied roomtype
    customName?: string;	// custom name, if supplied
    role?: number;			// roomtype identifier, if a roomtype is applied
    name_x?: number;		// area label position, horizontal offset from the area polygon centroid, in metres
    name_y?: number;		// area label position, vertical offset from the area polygon centroid, in metres
}

export interface Area extends AreaProps {
    poly: Point[];
    ceiling?: null; // TODO: add ceiling
    roomstyle_id?: string;  // if a roomstyle was chosen for this area
};

export interface Surface extends AreaProps {
    poly: SurfacePoint[];
    isRoof?: boolean;
    isCutout?: boolean;
    transparency?: number;
};

export interface Point3D extends Point {
    z: number;
}

export interface BezierPoint extends Point {
    cx: number;
    cy: number;
    cz?: number;
}

export type SurfacePoint = Point3D | BezierPoint;

export interface Dimension extends GenericLine {
    type: 'custom_dimension';
}

export interface Item extends Point3D {
    refid: string;
    width: number;
    height: number;
    z_height: number;
    rotation: number;
    mirrored?: [0 | 1, 0];
    light?: Light;
    materials?: SmartMaterials;
}

export interface Light {
    on: boolean;  // a light can be switched off
    color: Color;
    watt: number; // light intensity, integer in range 0..200
}

export interface SmartMaterials {
    [materialName: string]: number;
}

export interface Label extends Point {
    text: string;
    fontFamily: string;
    fontSize: number;			// in px
    letterSpacing: number;		// in %
    fontColor: Color;
    backgroundColor: Color;
    backgroundAlpha?: number;	// in %
    align: 'left' | 'center' | 'right';
    rotation: number;
    outline?: boolean;
    bold?: boolean;
    italic?: boolean;
}

export interface Line extends GenericLine {
    type: 'solid_line' | 'dashed_line' | 'dotted_line' | 'dashdotted_line';
    color: Color;
    thickness: number; // in pixels
}

export interface DesignSettings {
    engineAutoThickness: boolean;		// no longer used, always false
    engineAutoDims: boolean;			// automatically generate dimension lines
    areaLabelMultiplier: number;		// text scale factor for area labels
    scaleMultiplierDimensions: number;	// text scale factor for dimension text
    scaleMultiplierComments: number;	// text scale factor for regular labels
    showCeilings3D: boolean;
    minWallLength?: number;				// defaults to 4; walls shorter than this size are discarded
}