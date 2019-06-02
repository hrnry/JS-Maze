"use strict";
import { ImprovedNoise } from "./random.js";
import { Search } from "./graph.js";
import { Maze, Canvas2d } from "./module.js";


(function (){
  "use strict";

  console.log("main.js");

  let maze = new Maze();
  let size = {"x": 256, "y": 256, "scale": 1};
  let canvas = new Canvas2d("canvas", size.x, size.y, size.scale);
  canvas.clear("#000");
  const stage = document.getElementById("maze");
  //stage.appendChild(canvas.element);
  stage.insertBefore(canvas.element, stage.firstChild);

  const perlin = new ImprovedNoise([123456789, 362436069, 521288629, 88675123]);

  const generatorSizeElm = document.getElementById("generatorSize");
  const generatorAlgoElm = document.getElementById("generatorAlgo");
  const solverAlgoElm = document.getElementById("solverAlgo");

  let state = 0;
  let looper = null;

  function selectMazeSize(value){
    switch(value){
      case "T": size = {"x":  32, "y":  32, "scale": 16}; break;
      case "S": size = {"x":  64, "y":  64, "scale": 8}; break;
      case "M": size = {"x": 128, "y": 128, "scale": 4}; break;
      case "L": size = {"x": 256, "y": 256, "scale": 2}; break;
    }

    stage.removeChild(stage.firstChild);
    canvas = new Canvas2d("canvas", size.x, size.y, size.scale);
    canvas.clear("#000");
    stage.insertBefore(canvas.element, stage.firstChild);
  
    canvas.element.addEventListener("mouseup", ev => {
      if(ev.defaultPrevented){ return; }// Do nothing

      const pos = {"x": Math.floor(ev.offsetX / canvas.scale), "y": Math.floor(ev.offsetY / canvas.scale)};
      if(looper !== null){ looper.counter = Number.MAX_SAFE_INTEGER; }//loop cancel
      if(maze.map[pos.y][pos.x] === maze.WALL.num){ return; }
      if(state === 0){
        for(let y = 0; y < maze.height; y++){
          for(let x = 0; x < maze.width; x++){
            if(maze.map[y][x] === maze.START.num || maze.map[y][x] === maze.GOAL.num){
              maze.map[y][x] = maze.PASSAGE.num;
            }
          }
        }
        maze.map[pos.y][pos.x] = maze.START.num;
        drawMaze(canvas, maze);
        state = 1;
      }else{
        maze.map[pos.y][pos.x] = maze.GOAL.num;
        drawMaze(canvas, maze);
        state = 0;
        maze.maze2graph();
        looper = new Looper(maze.graph, canvas, 5, 4096);
        looper.path = getPath(maze.graph);
        looper.loop();
      }

      ev.preventDefault();
    }, true);
  }

  function selectGeneratorAlgo(value){
    let img, color = 0, noise = [], map = [];
    switch(value){
      case "c"://Clustering
        maze.clustering(canvas.element.width - 1, canvas.element.height - 1);
        break;
      case "p"://Perlin-Noize
        noise = [];
        for(let y = 0; y < canvas.element.height; y++){
          for(let x = 0; x < canvas.element.width; x++){
            noise.push(perlin.noise(x / 10, y / 10, 0));
          }
        }
        console.log(Math.max(...noise), Math.min(...noise));
        img = canvas.getImageData();
        for(let y = 0; y < canvas.element.height; y++){
          for(let x = 0; x < canvas.element.width; x++){
            color = 128 + 128 * noise[x + y * canvas.element.width];
            canvas.setRGBA(img, x,y, color);
          }
        }
        canvas.putImageData(img);
        break;
      case "ps"://Perlin-Noize(seamless tiling)
        const x2 = canvas.element.width / 2, y2 = canvas.element.height / 2;
        noise = perlin.seamless2d(x2, y2, 10.0, 0.01);
        console.log(Math.max(...noise), Math.min(...noise));
        img = canvas.getImageData();
        for(let y = 0; y < y2; y++){
          for(let x = 0; x < x2; x++){
            color = 128 + 128 * noise[x + y * x2];
            canvas.setRGBA(img, x,    y,    color);
            canvas.setRGBA(img, x+x2, y,    color);
            canvas.setRGBA(img, x,    y+y2, color);
            canvas.setRGBA(img, x+x2, y+y2, color);
          }
        }
        canvas.putImageData(img);
        break;
    }
    if(value === "p" || value === "ps"){
      //FIXME:
      canvas.binarize();
      img = canvas.getImageData();
      map = [];
      for(let y = 0; y < canvas.element.height; y++){
        map[y] = [];
        for(let x = 0; x < canvas.element.width; x++){
          color = img.data[(x + y * canvas.element.width) * 4];
          map[y].push((color === 0) ? maze.WALL.num : maze.PASSAGE.num);
        }
      }
      maze.map = map;
      maze.width = canvas.element.width;
      maze.height = canvas.element.height;
    }
  }

  function drawMaze(canvas2d, maze){
    let img = canvas2d.getImageData();
    let c = [0,0,0];
    for(let y = 0; y < maze.height; y++){
      for(let x = 0; x < maze.width; x++){
        switch(maze.map[y][x]){
          case maze.PASSAGE.num: c = [255,255,255]; break;
          case maze.START.num: c = [255,0,128]; break;
          case maze.GOAL.num: c = [128,0,255]; break;
          case maze.WALL.num: c = [128,128,128]; break;
        }
        canvas2d.setRGBA(img, x,y, c[0],c[1],c[2]);
      }
    }
    canvas2d.putImageData(img);
  }

  function getPath(graph){
    switch(solverAlgoElm.value){
      case "dfs"://Depth-First
        return Search.depthFirstSearch(graph, graph.startNode, graph.goalNode);
      case "bfs"://Breadth-First
        return Search.breadthFirstSearch(graph, graph.startNode, graph.goalNode);
      case "bfsm"://Best-First (Manhattan)
        return Search.bestFirstSearch(graph, graph.startNode, graph.goalNode, function (g, s, e){
          const value = {"src": g.getValue(s), "dst": g.getValue(e)};
          return Math.abs(value.dst.x - value.src.x) + Math.abs(value.dst.y - value.src.y);
        });
      case "bfse"://Best-First (Euclidean)
        return Search.bestFirstSearch(graph, graph.startNode, graph.goalNode, function (g, s, e){
          const value = {"src": g.getValue(s), "dst": g.getValue(e)};
          return Math.sqrt((value.dst.x - value.src.x) ** 2 + (value.dst.y - value.src.y) ** 2);
        });
      case "d"://Dijkstra
        return Search.dijkstra(graph, graph.startNode, graph.goalNode);
    }
    return null;
  }

  function generate(){
    selectMazeSize(generatorSizeElm.value);
    selectGeneratorAlgo(generatorAlgoElm.value);
    maze.maze2graph();
    drawMaze(canvas, maze);
    state = 0;
    if(looper !== null){
      looper.counter = Number.MAX_SAFE_INTEGER;//AnimationLoop cancel
    }
  }
  generate();

  generatorSizeElm.addEventListener("input", ev => { generate(); });
  generatorAlgoElm.addEventListener("input", ev => { generate(); });
  solverAlgoElm.addEventListener("input", ev => {
    for(let y = 0; y < maze.height; y++){
      for(let x = 0; x < maze.width; x++){
        if(maze.map[y][x] === maze.START.num || maze.map[y][x] === maze.GOAL.num){
          maze.map[y][x] = maze.PASSAGE.num;
        }
      }
    }
    drawMaze(canvas, maze);
    state = 0;
    if(looper !== null){
      looper.counter = Number.MAX_SAFE_INTEGER;//AnimationLoop cancel
      looper.path = getPath(looper.graph);
    }
  });

  class Looper{
    constructor(graph, canvas2d, interval = 5, maxCount = 4096){
      this.graph = graph;
      this.canvas2d = canvas2d;
      this.width = canvas2d.element.width;
      this.path = null;
      this.current;

      this.interval = interval;//frame per interval(ms)
      this.maxCount = maxCount;//Maximum number of times to draw
      this.counter = 0;
      this.lastTime = performance.now();
    }

    do(){
      if(this.path.length > 0){
        this.current = this.path.shift();
        const n = (this.graph.getValue(this.current).x + this.graph.getValue(this.current).y * this.width) * 4;
        let img = this.canvas2d.getImageData();
        img.data[n]   -= 128;
        img.data[n+1] -= 0;
        img.data[n+2] -= 128;
        this.canvas2d.putImageData(img);
      }
      return (this.path.length === 0) ? true : false;
    }

    loop(){// AnimationLoop
      if(performance.now() - this.lastTime > this.interval){
        this.counter++;
        if(this.do() === true){ return; }
        this.lastTime = performance.now();
      }
      if(this.counter < this.maxCount){ window.requestAnimationFrame(this.loop.bind(this)); }
    }
  }

})();
