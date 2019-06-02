"use strict";

/**
 * Graph
 */
/**
 * @typedef {Object} GraphEdge
 * @prop {*} dst
 * @prop {number} cost
 */
class GraphEdge{
  constructor(destination, cost = 1){
    this.dst = destination;

    // for WeightedGraph
    this.cost = cost;
  }
}

/**
 * @typedef {Object} GraphNode
 * @prop {*} data
 * @prop {Array<GraphEdge>} edges
 * @prop {boolean} isDone
 * @prop {number} cost
 * @prop {*} from
 */
class GraphNode{
  constructor(data){
    this.data = data;
    this.edges = [];

    // for Dijkstra
    this.isDone = false;
    this.cost = -1;
    this.from = null;
  }
}

class Graph{
  constructor(){
    this.nodes = new Map();
  }

  addNode(nodeName, value){ this.nodes.set(nodeName, new GraphNode(value)); }
  getNode(nodeName){ return this.nodes.get(nodeName); }
  getValue(nodeName){ return this.nodes.get(nodeName).data; }

  getNeighbor(nodeName){
    let neighbors = [];
    for(let edge of this.nodes.get(nodeName).edges){
      neighbors.push(edge.dst);
    }
    return neighbors;
  }

  getAllNeighbors(){
    let neighbors = {};
    for(let name of this.nodes.keys()){
      neighbors[name] = this.getNeighbor(name);
    }
    return neighbors;//隣接リスト Adjacency List ?
  }
}

//無向グラフ
class UndirectedGraph extends Graph{
  constructor(){ super(); }
  addEdge(src, dst){
    this.nodes.get(src).edges.push(new GraphEdge(dst));
    this.nodes.get(dst).edges.push(new GraphEdge(src));
  }
}

//有向グラフ
class DirectedGraph extends Graph{
  constructor(){ super(); }
  addEdge(src, dst){
    this.nodes.get(src).edges.push(new GraphEdge(dst));
  }
}

//重み付き無向グラフ
class WeightedUndirectedGraph extends Graph{
  constructor(){ super(); }
  addEdge(src, dst, cost){
    this.nodes.get(src).edges.push(new GraphEdge(dst, cost));
    this.nodes.get(dst).edges.push(new GraphEdge(src, cost));
  }

  getAllNeighborsCost(){
    let neighborsCost = {};
    for(let name of this.nodes.keys()){
      neighborsCost[name] = [];
      for(let edge of this.nodes.get(name).edges){
        neighborsCost[name].push(edge.cost);
      }
    }
    return neighborsCost;
  }
}
export { UndirectedGraph, DirectedGraph, WeightedUndirectedGraph };


/**
 * Heap
 */
class BinaryHeap{
  constructor(){
    this.heap = [];
    this.length = 0;
    this.comparator = (a, b) => { return (a >= b) ? true : false; };
  }

  enqueue(value, priority = 0){//up-heap
    let n = this.length++;
    while(0 < n){
      let parent = Math.floor((n - 1) / 2);
      if(this.comparator(this.heap[parent].priority, priority)){ break; }
      this.heap[n] = this.heap[parent];
      n = parent;
    }
    this.heap[n] = {"value": value, "priority": priority};
  }

  dequeue(){//down-heap
    const top = this.heap[0];
    const last = this.heap[--this.length];
    let n = 0;
    while(n * 2 + 1 < this.length){
      let left = n * 2 + 1;
      const right = left + 1;
      if(right < this.length && this.comparator(this.heap[right].priority, this.heap[left].priority)){ left = right; }
      if(this.comparator(last.priority, this.heap[left].priority)){ break; }
      this.heap[n] = this.heap[left];
      n = left;
    }
    this.heap[n] = last;
    return top.value;
  }

  size(){ return this.length; }
}

class MaxHeap extends BinaryHeap{
  constructor(){
    super();
    this.comparator = (a, b) => { return (a >= b) ? true : false; };
  }
}

class MinHeap extends BinaryHeap{
  constructor(){
    super();
    this.comparator = (a, b) => { return (a < b) ? true : false; };
  }
}
export { MaxHeap, MinHeap };


/**
 * Search
 * unshift -> 0 [1,2] 3 <- push
 *  shift  0 <- [1,2] -> 3 pop
 */
class Search{
  //深さ優先探索 end===null なら全探索
  static depthFirstSearch(graph, start, end){
    let current;
    let visited = [];
    let stack = [];//LIFO: Last In First Out; FILO: First In Last Out
    stack.push(start);
    while(stack.length > 0){
      current = stack.pop();
      if((current === undefined) || visited.includes(current)){ continue; }
      visited.push(current);
      if(current === end){ return visited; }
      graph.getNeighbor(current).reverse().forEach(n => { stack.push(n); });//reverse?
    }
    return visited;
  }

  //幅優先探索 end===null なら全探索
  static breadthFirstSearch(graph, start, end){
    let current;
    let visited = [];
    let queue = [];//FIFO: First In First Out
    queue.unshift(start);
    while(queue.length > 0){
      current = queue.pop();
      if((current === undefined) || visited.includes(current)){ continue; }
      visited.push(current);
      if(current === end){ return visited; }
      graph.getNeighbor(current).forEach(n => { queue.unshift(n); });
    }
    return visited;
  }

  //最良優先探索: 幅優先探索を拡張
  static bestFirstSearch(graph, start, end, heuristic = (g, s, e) => {//ノード評価関数
    const value = {"src": g.getValue(s), "dst": g.getValue(e)};
    //return Math.abs(value.dst.x - value.src.x) + Math.abs(value.dst.y - value.src.y);//Manhattan distance / L1
    //return Math.sqrt(Math.pow((value.dst.x - value.src.x), 2) + Math.pow((value.dst.y - value.src.y), 2));//Euclidean distance / L2
    return Math.sqrt((value.dst.x - value.src.x) ** 2 + (value.dst.y - value.src.y) ** 2);//ES6~: Math.pow(x, y) === x ** y
  }){
    let current;
    let visited = [];
    let queue = new MinHeap();//優先度付きキュー
    queue.enqueue(start, heuristic(graph, start, end));
    while(queue.size() > 0){
      current = queue.dequeue();
      if((current === undefined) || visited.includes(current)){ continue; }
      visited.push(current);
      if(current === end){ return visited; }
      graph.getNeighbor(current).forEach(n => { queue.enqueue(n, heuristic(graph, n, end)); });
    }
    return visited;
  }

  //ダイクストラ法
  static dijkstra(graph, start, end){
    let current;
    let visited = [];
    let queue = new MinHeap();//"ノード名"を、ノードのコストで最小ヒープ
    graph.getNode(start).cost = 0;//スタートノード: コスト=0
    queue.enqueue(start, 0);//リストにスタートノードを追加する
    const neighbors = graph.getAllNeighbors();
    const neighborsCost = graph.getAllNeighborsCost();
    while(queue.size() > 0){//リストが空でなければループ
      current = queue.dequeue();//最小コストのノード(名)を取り出し
      graph.getNode(current).isDone = true;//確定ノードとする
      visited.push(current);
      const n = neighbors[current];
      for(let i = 0; i < n.length; i++){
        let node = graph.getNode(n[i]);
        if(node.isDone === false){
          const curCost = graph.getNode(current).cost;
          let newCost = neighborsCost[current][i];
          if(curCost > 0){ newCost += curCost; }
          const dstCost = node.cost;
          if(dstCost === -1 || dstCost > newCost){//コスト, 経路 を更新
            node.cost = newCost;
            node.from = current;
            if(dstCost === -1){ queue.enqueue(n[i], newCost); }//隣接する未確定ノードをリストに追加する
          }
        }
      }
    }
    console.log("cost", graph.getNode(end).cost);
    let shortestPath = [];
    shortestPath.push(end);
    for(let f = graph.getNode(end).from; f !== null; f = graph.getNode(f).from){
      shortestPath.push(f);
    }
    if(shortestPath.length === 1){ return visited; }
    return shortestPath.reverse();
  }

  //TODO: A*
  static aStar(graph, start, end){}
}
export { Search };
