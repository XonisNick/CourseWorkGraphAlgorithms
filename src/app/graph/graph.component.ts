import { Component, OnInit, ElementRef, Renderer2, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import { Node } from '../data/graph/node.dataclass';
import { Graph } from '../data/graph/graph.dataclass';
import {Link} from '../data/graph/link.dataclass';
import * as peopleData from '../../assets/mockup/people.json';
import * as d3Polygon from 'd3-polygon';
@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit {
  private svg: any;
  private simulation: any;
  private link: any;
  private node: any;
  private text: any;
  private contextMenuCoords = { x: 0, y: 0 };
  private linkLabels: any;
  @ViewChild('contextMenu', { static: true }) contextMenu: ElementRef | null = null;
  data: Graph = new Graph();
  tags: string[] = [
    "Подорожі",
    "Спорт",
    "Фільми"
  ];
  clusterCenters: { [key: string]: { x: number; y: number } } = {};
  jsonData: any = JSON.stringify(this.data);
  private firstClickedNode: Node | null = null; // To keep track of the first clicked node

  startNode: string = 'Alice';
  endNode: string = 'Bob';
  colorScale: any;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit(): void {
    this.generateRandomData(30, 50);
    this.createGraph();
    this.updateGraph(JSON.stringify(this.data));
  }
  
  private generateRandomData(nodeCount: number, linkCount: number): void {
    const { firstNames, lastNames, ages } = peopleData;
    const nodes: Node[] = [];
    const links: Link[] = [];

    // Generate random nodes with tags
    for (let i = 0; i < nodeCount; i++) {
      const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const randomAge = ages[Math.floor(Math.random() * ages.length)];
      const randomTagIndex = Math.floor(Math.random() * this.tags.length);
      const tag = this.tags[randomTagIndex];

      nodes.push({ 
        id: `${i}`, 
        name: `${randomFirstName} ${randomLastName}`, 
        age: randomAge,
        tags: [tag],
        cluster: ""
      });
    }

    this.colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(this.tags);

    // Generate random links
    for (let i = 0; i < linkCount; i++) {
      const sourceIndex = Math.floor(Math.random() * nodeCount);
      let targetIndex = Math.floor(Math.random() * nodeCount);
      while (targetIndex === sourceIndex) {
        targetIndex = Math.floor(Math.random() * nodeCount);
      }
      links.push({ 
        source: nodes[sourceIndex].id, 
        target: nodes[targetIndex].id, 
        bidirectional: true, 
        weight: 1 
      });
    }

    this.data.nodes = nodes;
    this.data.links = links;
  }
  color(tag: string): string {
    return this.colorScale(tag);
  }
  private defineClusterCenters(width: number, height: number): void {
    const numTags = this.tags.length;
    const angleStep = (2 * Math.PI) / numTags;
    const radius = Math.min(width, height) / 3;
  
    this.clusterCenters = {};
    
    this.tags.forEach((tag, index) => {
      const angle = index * angleStep;
      const x = (width / 2) + radius * Math.cos(angle);
      const y = (height / 2) + radius * Math.sin(angle);
      this.clusterCenters[tag] = { x, y };
    });
  }
  generateRandomPeople(): void {
    const { firstNames, lastNames, ages } = peopleData;
    const people = [];

    for (let i = 0; i < 30; i++) {
      const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const randomAge = ages[Math.floor(Math.random() * ages.length)];

      people.push({
        firstName: randomFirstName,
        lastName: randomLastName,
        age: randomAge
      });
    }

    console.log(people);
    alert('Random people generated! Check console for results.');

    // You can use this people array as needed in your application
  }
  private createGraph(): void {
    const element = this.el.nativeElement;
    this.svg = d3.select(element).select('svg');
  
    const width = +this.svg.attr('width');
    const height = +this.svg.attr('height');
  
    this.simulation = d3.forceSimulation<Node>(this.data.nodes)
      .force('link', d3.forceLink<Node, Link>(this.data.links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2));
  
    this.link = this.svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.data.links)
      .enter()
      .append('line')
      .attr('stroke-width', 2)
      .attr('stroke', '#999');
  
    this.linkLabels = this.svg.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(this.data.links)
      .enter()
      .append('text')
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text((d: Link) => d.weight);
  
    this.node = this.svg.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(this.data.nodes)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', '#69b3a2')
      .on('click', (event: MouseEvent, d: Node) => this.nodeClicked(event, d))
      .call(
        d3.drag<SVGCircleElement, Node>()
          .on('start', (event, d) => this.dragstarted(event, d, this.simulation))
          .on('drag', (event, d) => this.dragged(event, d))
          .on('end', (event, d) => this.dragended(event, d, this.simulation))
      );
  
    this.text = this.svg.append('g')
      .attr('class', 'texts')
      .selectAll('text')
      .data(this.data.nodes)
      .enter()
      .append('text')
      .attr('dy', -15)
      .text((d: any) => d.id);
  
    this.simulation.on('tick', () => this.ticked(width, height));
  
    this.renderer.listen('document', 'click', () => {
      if (this.contextMenu) {
        this.contextMenu.nativeElement.style.display = 'none';
      }
    });
  }
  
  private ticked(width: number, height: number): void {
    this.link
      .attr('x1', (d: any) => (d.source as Node).x!)
      .attr('y1', (d: any) => (d.source as Node).y!)
      .attr('x2', (d: any) => (d.target as Node).x!)
      .attr('y2', (d: any) => (d.target as Node).y!);
  
    this.linkLabels
      .attr('x', (d: any) => ((d.source as Node).x! + (d.target as Node).x!) / 2)
      .attr('y', (d: any) => ((d.source as Node).y! + (d.target as Node).y!) / 2);
  
    this.node
      .attr('cx', (d: any) => {
        if (d.x! < 0) {
          d.x = 0;
          d.vx = Math.abs(d.vx!);
        } else if (d.x! > width) {
          d.x = width;
          d.vx = -Math.abs(d.vx!);
        }
        return d.x!;
      })
      .attr('cy', (d: any) => {
        if (d.y! < 0) {
          d.y = 0;
          d.vy = Math.abs(d.vy!);
        } else if (d.y! > height) {
          d.y = height;
          d.vy = -Math.abs(d.vy!);
        }
        return d.y!;
      });
  
    this.text
      .attr('x', (d: any) => d.x!)
      .attr('y', (d: any) => d.y!);
  }
  
  
  nodeClicked(event: MouseEvent, d: Node): void {
    if (this.firstClickedNode === null) {
      // First node clicked
      this.firstClickedNode = d;
    } else {
      // Second node clicked, create a link
      const newLink: Link = {
        source: this.firstClickedNode,
        target: d,
        bidirectional: true,
        weight: 0
      };
      this.data.links.push(newLink);
      this.firstClickedNode = null; // Reset the first clicked node
      this.updateGraph(JSON.stringify(this.data));
    }
  }

  calculateDegreeCentrality(): void {
    const centrality = this.data.nodes.map(node => {
      const degree = this.data.links.filter(link => {
        const sourceId =
          typeof link.source === 'string' ? link.source : (link.source as Node).id;
        const targetId =
          typeof link.target === 'string' ? link.target : (link.target as Node).id;
        return sourceId === node.id || targetId === node.id;
      }).length;
      return { id: node.id, name: node.name, degree };
    });
  
    console.log('Алгоритм центральності:', centrality);
    this.updateOutput('degreeCentralityOutput', centrality);
  }

  calculateBetweennessCentrality(): void {
    const nodes = this.data.nodes;
    const links = this.data.links;
    const centrality = nodes.map(node => ({ id: node.id, betweenness: 0 }));
  
    const nodeMap = new Map(nodes.map((node, i) => [node.id, i]));
    const numNodes = nodes.length;
    const distances: number[][] = Array.from({ length: numNodes }, () => Array(numNodes).fill(Infinity));
    const paths: number[][] = Array.from({ length: numNodes }, () => Array(numNodes).fill(0));
  
    nodes.forEach((_, i) => (distances[i][i] = 0));
    links.forEach(link => {
      const u: number = nodeMap.get(typeof link.source === 'string' ? link.source : (link.source as Node).id)!;
      const v: number = nodeMap.get(typeof link.target === 'string' ? link.target : (link.target as Node).id)!;
      distances[u][v] = distances[v][u] = 1;
      paths[u][v] = paths[v][u] = 1;
    });
  
    for (let k = 0; k < numNodes; k++) {
      for (let i = 0; i < numNodes; i++) {
        if (i === k || distances[i][k] === Infinity) continue;
        for (let j = 0; j < numNodes; j++) {
          if (i === j || j === k || distances[k][j] === Infinity) continue;
          const d = distances[i][k] + distances[k][j];
          if (distances[i][j] > d) {
            distances[i][j] = d;
            paths[i][j] = paths[i][k] * paths[k][j];
          } else if (distances[i][j] === d) {
            paths[i][j] += paths[i][k] * paths[k][j];
          }
        }
      }
    }
  
    for (let i = 0; i < numNodes; i++) {
      for (let j = 0; j < numNodes; j++) {
        if (i === j || paths[i][j] === 0) continue;
        for (let k = 0; k < numNodes; k++) {
          if (i === k || j === k || distances[i][j] !== distances[i][k] + distances[k][j]) continue;
          centrality[k].betweenness += (paths[i][k] * paths[k][j]) / paths[i][j];
        }
      }
    }
    centrality.sort((a, b) => b.betweenness - a.betweenness);
  
    console.log('Центральність посередників:', centrality);
    this.updateOutput('betweennessCentralityOutput', centrality);
  }
  calculatePageRank(): void {
    const nodes = this.data.nodes;
    const links = this.data.links;
  
    const dampingFactor = 0.85;
    const maxIterations = 100;
    const tolerance = 1e-6;
    const numNodes = nodes.length;
  
    const nodeMap = new Map(nodes.map((node, i) => [node.id, i]));
    const ranks = new Array(numNodes).fill(1 / numNodes);
    const newRanks = new Array(numNodes).fill(0);
  
    const outgoingLinks = nodes.map(node =>
      links.filter(link => (typeof link.source === 'string' ? link.source : (link.source as Node).id) === node.id).length
    );
  
    for (let iter = 0; iter < maxIterations; iter++) {
      let rankChange = 0;
      for (let i = 0; i < numNodes; i++) {
        let rankSum = 0;
        links.forEach(link => {
          const sourceIndex = nodeMap.get(typeof link.source === 'string' ? link.source : (link.source as Node).id)!;
          const targetIndex = nodeMap.get(typeof link.target === 'string' ? link.target : (link.target as Node).id)!;
          if (targetIndex === i) {
            rankSum += ranks[sourceIndex] / outgoingLinks[sourceIndex];
          }
        });
        newRanks[i] = (1 - dampingFactor) / numNodes + dampingFactor * rankSum;
        rankChange += Math.abs(newRanks[i] - ranks[i]);
      }
      if (rankChange < tolerance) break;
      for (let i = 0; i < numNodes; i++) {
        ranks[i] = newRanks[i];
      }
    }
  
    const centrality = nodes.map((node, i) => ({
      id: node.id,
      pageRank: ranks[i]
    }));
  
    // Sort the centrality array in descending order based on the pageRank property
    centrality.sort((a, b) => b.pageRank - a.pageRank);
  
    console.log('Алгоритм Пейджа-Ранка:', centrality);
    this.updateOutput('pageRankOutput', centrality);
  }
  
  
  findShortestPath(start: string, end: string): void {
    const nodes = this.data.nodes;
    const links = this.data.links;
  
    const distances: { [key: string]: number } = {};
    const previous: { [key: string]: string | null } = {};
    const queue: string[] = [];
  
    nodes.forEach(node => {
      distances[node.id] = Infinity;
      previous[node.id] = null;
      queue.push(node.id);
    });
  
    distances[start] = 0;
  
    while (queue.length > 0) {
      const u = queue.reduce(
        (minNode, node) => (distances[node] < distances[minNode] ? node : minNode),
        queue[0]
      );
      queue.splice(queue.indexOf(u), 1);
  
      if (u === end) {
        const path = [];
        let temp: any = u;
        while (temp) {
          path.push(temp);
          temp = previous[temp];
        }
        path.reverse();
        console.log('Shortest Path:', path);
        let result = path.join(' -> ');
        alert('Найкоротший шлях: ' + result);
  
        // Highlight the shortest path
        this.highlightPath(path);
        this.updateOutput('shortestPathOutput', path);
        return;
      }
  
      links.forEach(link => {
        const source = typeof link.source === 'string' ? link.source : (link.source as Node).id;
        const target = typeof link.target === 'string' ? link.target : (link.target as Node).id;
  
        // Check if the link is directed and if the direction is from source to target
        if (source === u && queue.includes(target)) {
          const alt = distances[u] + link.weight;
          if (alt < distances[target]) {
            distances[target] = alt;
            previous[target] = u;
          }
        }
  
        // Check if the link is directed and if the direction is from target to source
        if (link.bidirectional && target === u && queue.includes(source)) {
          const alt = distances[u] + link.weight;
          if (alt < distances[source]) {
            distances[source] = alt;
            previous[source] = u;
          }
        }
      });
    }
  }
  private updateOutput(elementId: string, data: any): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = JSON.stringify(data, null, 2);
    }
  }
  private highlightPath(path: string[]): void {
    // Reset all nodes and links to default styles
    this.node.attr('fill', '#69b3a2');
    this.link.attr('stroke', '#999').attr('stroke-width', 2);

    // Highlight nodes in the path
    this.node
      .filter((d: any) => path.includes(d.id))
      .attr('fill', 'orange');

    // Highlight links in the path
    for (let i = 0; i < path.length - 1; i++) {
      const source = path[i];
      const target = path[i + 1];
      this.link
        .filter(
          (d: any) =>
            (d.source.id === source && d.target.id === target) ||
            (d.source.id === target && d.target.id === source)
        )
        .attr('stroke', 'orange')
        .attr('stroke-width', 4);
    }
  }

  updateGraph(jsonData: string): void {
    try {
    const clusterBorders = this.svg.select('.cluster-borders');

      clusterBorders.selectAll('path').remove();
      const updatedData = JSON.parse(jsonData);
  
      updatedData.links.forEach((link: any) => {
        if (typeof link.source === 'object') {
          link.source = link.source.id;
        }
        if (typeof link.target === 'object') {
          link.target = link.target.id;
        }
      });
  
      this.data.nodes = updatedData.nodes;
      this.data.links = updatedData.links;
  
      this.link = this.svg.select('.links').selectAll('line').data(this.data.links);
      this.link.exit().remove();
      this.link = this.link.enter().append('line').merge(this.link)
        .attr('stroke-width', 2)
        .attr('stroke', '#999');
  
      this.linkLabels = this.svg.select('.link-labels').selectAll('text').data(this.data.links);
      this.linkLabels.exit().remove();
      this.linkLabels = this.linkLabels.enter().append('text').merge(this.linkLabels)
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .text((d: Link) => d.weight);
  
      this.node = this.svg.select('.nodes').selectAll('circle').data(this.data.nodes);
      this.node.exit().remove();
      this.node = this.node.enter().append('circle').merge(this.node)
        .attr('r', 10)
        .attr('fill', '#69b3a2')
        .on('click', (event: MouseEvent, d: Node) => this.nodeClicked(event, d))
        .call(
          d3.drag<SVGCircleElement, Node>()
            .on('start', (event, d) => this.dragstarted(event, d, this.simulation))
            .on('drag', (event, d) => this.dragged(event, d))
            .on('end', (event, d) => this.dragended(event, d, this.simulation))
        );
  
      this.text = this.svg.select('.texts').selectAll('text').data(this.data.nodes);
      this.text.exit().remove();
      this.text = this.text.enter().append('text').merge(this.text)
        .attr('dy', -15)
        .text((d: any) => '[' + d.id + '] ' + d.name);
  
      this.simulation.nodes(this.data.nodes);
      (this.simulation.force('link') as d3.ForceLink<Node, Link>).links(this.data.links);
      this.simulation.alpha(1).restart();
      this.jsonData = JSON.stringify(this.data);
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
  }
  
  addNode(event: MouseEvent): void {
    const newNode: Node = {
      id: `Node${this.data.nodes.length + 1}`,
      name: `Node${this.data.nodes.length + 1}`, // Provide a default name
      x: this.contextMenuCoords.x,
      y: this.contextMenuCoords.y,
      fx: null,
      fy: null,
      tags: [],
      age:0,
      cluster:""
    };

    this.data.nodes.push(newNode);
    this.updateGraph(JSON.stringify(this.data));
    if (this.contextMenu) {
      this.contextMenu.nativeElement.style.display = 'none';
    }
  }

  showContextMenu(): void {
    const contextMenuElem = this.contextMenu!.nativeElement;
    contextMenuElem.style.display = 'block';
    contextMenuElem.style.left = `${this.contextMenuCoords.x}px`;
    contextMenuElem.style.top = `${this.contextMenuCoords.y}px`;
  }

  onRightClick(event: MouseEvent): void {
    event.preventDefault();
    this.contextMenuCoords = { x: event.clientX, y: event.clientY };
    this.showContextMenu();
  }

  private dragstarted(event: any, d: Node, simulation: d3.Simulation<Node, Link>): void {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  createClusterGraph(): void {
    const element = this.el.nativeElement;
    this.svg.selectAll('*').remove(); // Clear the existing graph
  
    const width = +this.svg.attr('width');
    const height = +this.svg.attr('height');
  
    this.defineClusterCenters(width, height); // Define cluster centers based on the SVG dimensions
  
    // Append cluster borders first
    this.svg.append('g').attr('class', 'cluster-borders');
  
    const clusterForce = d3.forceSimulation<Node>(this.data.nodes)
      .force('link', d3.forceLink<Node, Link>(this.data.links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('cluster', this.forceCluster());
  
    this.link = this.svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.data.links)
      .enter()
      .append('line')
      .attr('stroke-width', 2)
      .attr('stroke', '#999');
  
    this.node = this.svg.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(this.data.nodes)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', (d: any) => this.getColor(d.tags))
      .call(
        d3.drag<SVGCircleElement, Node>()
          .on('start', (event, d) => this.dragstarted(event, d, clusterForce))
          .on('drag', (event, d) => this.dragged(event, d))
          .on('end', (event, d) => this.dragended(event, d, clusterForce))
      );
  
    this.text = this.svg.append('g')
      .attr('class', 'texts')
      .selectAll('text')
      .data(this.data.nodes)
      .enter()
      .append('text')
      .attr('dy', -15)
      .text((d: any) => d.name);
  
    clusterForce.on('tick', () => {
      this.link
        .attr('x1', (d: any) => (d.source as Node).x!)
        .attr('y1', (d: any) => (d.source as Node).y!)
        .attr('x2', (d: any) => (d.target as Node).x!)
        .attr('y2', (d: any) => (d.target as Node).y!);
  
      this.node
        .attr('cx', (d: any) => d.x!)
        .attr('cy', (d: any) => d.y!);
  
      this.text
        .attr('x', (d: any) => d.x!)
        .attr('y', (d: any) => d.y!);
  
      this.updateClusterBorders();
    });
  }
  
  
  
  updateClusterBorders(): void {
    const clusterBorders = this.svg.select('.cluster-borders');
  
    // Remove any existing cluster borders to avoid duplication
    clusterBorders.selectAll('path').remove();
  
    const clusterGroups = new Map<string, Node[]>();
    
    // Group nodes by each tag they have
    this.data.nodes.forEach(node => {
      node.tags.forEach(tag => {
        if (!clusterGroups.has(tag)) {
          clusterGroups.set(tag, []);
        }
        clusterGroups.get(tag)!.push(node);
      });
    });
  
    // Draw cluster borders for each group of nodes
    clusterGroups.forEach((nodes, cluster) => {
      const validNodes = nodes.filter(node => node.x !== undefined && node.y !== undefined);
      const points: [number, number][] = validNodes.map(node => [node.x!, node.y!]);
  
      const hull = d3Polygon.polygonHull(points);
  
      if (hull) {
        clusterBorders.append('path')
          .attr('d', `M${hull.join('L')}Z`)
          .attr('fill', this.getColor([cluster]))
          .attr('stroke', this.getColor([cluster]))
          .attr('stroke-width', 2)
          .attr('fill-opacity', 0.1);
      }
    });
  }
  
  
  
  
  getColor(tags: string[]): string {
    // Logic to determine color based on multiple tags
    // For simplicity, let's return a color based on the first tag
    return tags.length ? this.color(tags[0]) : '#ccc';
  }
  
  getBackgroundColor(tags: string[]): string {
    // Logic to determine background color based on multiple tags
    // For simplicity, let's return a slightly different color based on the first tag
    return tags.length ? this.color(tags[0]) : '#ccc';
  }
  
  private forceCluster(): d3.Force<any, any> {
    return (alpha: number) => {
      this.data.nodes.forEach((d: any) => {
        const clusterCenter = this.clusterCenters[d.tags[0]];
        if (clusterCenter) {
          d.x += (clusterCenter.x - d.x) * 0.1 * alpha;
          d.y += (clusterCenter.y - d.y) * 0.1 * alpha;
        }
      });
    };
  }
  private dragged(event: any, d: Node): void {
    d.fx = event.x;
    d.fy = event.y;
  }

  private dragended(event: any, d: Node, simulation: d3.Simulation<Node, Link>): void {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}
