import { Node } from "./node.dataclass";
import * as d3 from 'd3';
export interface Link extends d3.SimulationLinkDatum<Node> {
    source: string | Node,
    target: string | Node,
    bidirectional: boolean,
    weight: number
}