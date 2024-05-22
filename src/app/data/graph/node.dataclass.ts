import * as d3 from 'd3';

export interface Node extends d3.SimulationNodeDatum{
  cluster: any;
  id: string;
  name: string;
  tags: string[];
  age: number;
}
