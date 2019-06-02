import { Xorshift, Shuffle } from "./random.js";
import { UndirectedGraph, WeightedUndirectedGraph } from "./graph.js";
"use strict";

/**
 * Maze
 */
class Maze{
  constructor(seed = [123456789, 362436069, 521288629, 88675123]){
    this.seed = seed;
    this.random = new Xorshift(this.seed);
    this.shuffle = new Shuffle(this.seed);
    this.width = 0;
    this.height = 0;
    this.map = [];
    this.graph = new UndirectedGraph();

    this.WALL = {"num": 255, "char": "#"};
    this.PASSAGE = {"num": 0, "char": " "};//FIXME: 0-127?
    this.START = {"num": 129, "char": "S"};
    this.GOAL = {"num": 130, "char": "G"};
  }

  /**
   * クラスタリングによる迷路作成アルゴリズム
   * http://meijiro.osdn.jp/algorithm.html
   * https://qiita.com/kaityo256/items/b2e504c100f4274deb42
   * FIXME: 現状、w, h には奇数のみ指定可
   * @param {*} width
   * @param {*} height
   */
  clustering(width, height){
    this.width = width;
    this.height = height;
    //init
    let map = [];
    for(let y = 0; y < height; y++){
      map[y] = [];
      for(let x = 0; x < width; x++){
        //0:Wall, 1~:Cluster Number
        map[y][x] = (x % 2 === 0 || y % 2 === 0 || x === width - 1 || y === height - 1) ? 0 : 1 + x + y * width;
      }
    }
    //clustering
    let min = 1 + width * height, max = 0;
    while(min !== max){
      for(let y = 0; y < height; y++){
        if(y % 2 === 0 || y === height - 1){ continue; }
        for(let x = 0; x < width; x++){
          if(x % 2 === 0 || x === width - 1){ continue; }
          this.shuffle.fisherYates([[-2,0, -1,0],[2,0, 1,0],[0,2, 0,1],[0,-2, 0,-1]]).forEach(a => {
            if(this.random.next() > 1073741824){ return; }//if(Math.random() > 0.25){ return; }
            const dx = x + a[0], dy = y + a[1];
            if(0 <= dx && dx < width && 0 <= dy && dy < height){
              const src = map[y][x], dst = map[dy][dx];
              if(src !== dst){
                map[y + a[3]][x + a[2]] = src;//break wall
                for(let j = 0; j < height; j++){
                  for(let i = 0; i < width; i++){
                    if(map[j][i] === dst){ map[j][i] = src; }//fill dst-cluster
                  }
                }
              }
            }
          });
        }
      }
      min = width * height; max = 0;
      for(let y = 0; y < height; y++){
        if(y % 2 === 0 || y === height - 1){ continue; }
        for(let x = 0; x < width; x++){
          if(x % 2 === 0 || x === width - 1){ continue; }
          const src = map[y][x];
          min = Math.min(min, src); max = Math.max(max, src);
        }
      }
    }
    for(let y = 0; y < height; y++){
      for(let x = 0; x < width; x++){
        map[y][x] = (map[y][x] === 0) ? this.WALL.num : this.PASSAGE.num;
      }
    }
    this.map = map;
    return map;
  }

  maze2graph(nmap = this.map, width = this.width, height = this.height){
    let graph = new WeightedUndirectedGraph();
    //Add Nodes
    for(let y = 0; y < height; y++){
      for(let x = 0; x < width; x++){
        const nodeName = x + ',' + y;
        const num = nmap[y][x];
        if(num === this.WALL.num){ continue; }
        graph.addNode(nodeName, {"x": x, "y": y});
        switch(num){
          case this.START.num: graph.startNode = nodeName; break;
          case this.GOAL.num: graph.goalNode = nodeName; break;
        }
      }
    }
    //Add Edges
    graph.nodes.forEach((value, key, map) => {
      [[-1,0], [1,0], [0,-1], [0,1]].forEach(d => {
        const dx = value.data.x + d[0], dy = value.data.y + d[1];
        if(0 <= dx && dx < width && 0 <= dy && dy < height && nmap[dy][dx] === this.PASSAGE.num){
          graph.addEdge(key, dx + ',' + dy, 1 + Math.abs(nmap[dy][dx] - nmap[value.data.y][value.data.x]));//FIXME: EdgeCost
        }
      });
    });
    this.graph = graph;
    return graph;
  }

  //TODO: 
  roguelike(){}
}
export { Maze };


/**
 * canvas 2d
 */
class Canvas2d{
  constructor(id, width, height, scale){
    this.scale = scale;
    this.element = document.createElement("canvas");
    this.element.id = id;
    this.setSize(width, height, scale);
    //this.element.style.imageRendering = "pixelated";
    this.element.style.imageRendering = "crisp-edges";
    this.context = this.element.getContext("2d");
    this.context.imageSmoothingEnabled = false;
    this.clear();
  }

  setSize(width, height, scale){
    this.element.width = width;
    this.element.height = height;
    this.element.style.width = (width * scale).toString() + "px";
    this.element.style.height = (height * scale).toString() + "px";
  }

  clear(color){
    if(arguments.length === 0){//color === undefined
      this.context.clearRect(0,0, this.element.width,this.element.height);
    }else{
      this.context.fillStyle = color;
      this.context.fillRect(0,0, this.element.width,this.element.height);
    }
  }

  /**
   * ImageData{ width, height, Uint8ClampedArray data(RGBA[width * height]) }
   * @returns {ImageData} ImageData
   */
  getImageData(){
    return this.context.getImageData(0,0, this.element.width,this.element.height);
  }

  /**
   * ImageData{ width, height, Uint8ClampedArray data(RGBA[width * height]) }
   * @param {ImageData} img
   */
  putImageData(img){
    this.context.putImageData(img, 0,0);
  }

  /**
   * 
   * @param {ImageData} img ImageData{ width, height, data }
   * @param {number} x 0-img.width
   * @param {number} y 0-img.height
   * @param {number} R red 0-255
   * @param {number} G green 0-255
   * @param {number} B blue 0-255
   * @param {number} A alpha 0-255
   */
  setRGBA(img, x,y, R,G = R,B = R,A = 255){
    const pos = (x + y * img.width) * 4;
    img.data[pos]   = R;
    img.data[pos+1] = G;
    img.data[pos+2] = B;
    img.data[pos+3] = A;
  }

  invert(){
    let image = this.getImageData();
    for(let i = 0; i < image.data.length; i += 4){
      image.data[i]   = 255 - image.data[i];
      image.data[i+1] = 255 - image.data[i+1];
      image.data[i+2] = 255 - image.data[i+2];
    }
    this.putImageData(image);
  }

  // https://ja.wikipedia.org/wiki/%E3%82%B0%E3%83%AC%E3%83%BC%E3%82%B9%E3%82%B1%E3%83%BC%E3%83%AB
  luma(r, g, b){
    //return Math.round((r + g + b) / 3);
    //return Math.round((r >>> 2) + (g >>> 1) + (b >>> 2));//YCgCo (Y)
    //return Math.round(r * 0.2126 + g * 0.7152 + b * 0.0722);//CIE XYZ (Y), ITU-R Rec BT.709
    return Math.round(r * 0.2627 + g * 0.6780 + b * 0.0593);//ITU-R Rec BT.2100
    //return Math.round(r * 0.299 + g * 0.587 + b * 0.114);//ITU-R Rec BT.601, YCbCr (Y)
    //return Math.round(r * 0.298839 + g * 0.586811 + b * 0.114350);//ImageMagick
  }

  grayscale(){
    let image = this.getImageData();
    let gray = 0;
    for(let i = 0; i < image.data.length; i += 4){
      gray = this.luma(image.data[i], image.data[i + 1], image.data[i + 2]);
      image.data[i] = image.data[i + 1] = image.data[i + 2] = gray;
    }
    this.putImageData(image);
  }

  binarize(){
    let image = this.getImageData();
    let gray = 0;
    let avg = 0;
    for(let i = 0; i < image.data.length; i += 4){
      avg += this.luma(image.data[i], image.data[i + 1], image.data[i + 2]);
    }
    avg = avg / (image.data.length / 4);
    for(let i = 0; i < image.data.length; i += 4){
      gray = this.luma(image.data[i], image.data[i + 1], image.data[i + 2]);
      image.data[i] = image.data[i + 1] = image.data[i + 2] = (gray > avg) ? 255 : 0;
    }
    this.putImageData(image);
  }
}
export { Canvas2d };
