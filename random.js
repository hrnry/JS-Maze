/**
 * Xorshift128
 */
class Xorshift{
  /**
   * @param {Array<number>} seed [123456789, 362436069, 521288629, 88675123]
   */
  constructor(seed = [123456789, 362436069, 521288629, 88675123]){
    if(seed.every(n => n === 0)){
      throw new Error("Can not set all of seed[4] to 0");
    }
    this.u32 = Uint32Array.from(seed.concat(0));
  }

  /**
   * @returns {number} 0-4294967295(0xFFFFFFFF)
   */
  next(){
    this.u32[4] = this.u32[0] ^ (this.u32[0] << 11);
    this.u32[0] = this.u32[1];  this.u32[1] = this.u32[2];  this.u32[2] = this.u32[3];
    return this.u32[3] = ( (this.u32[3] ^ (this.u32[3] >>> 19)) ^ (this.u32[4] ^ (this.u32[4] >>> 8)) ) >>> 0;
  }

  nextInt(min = 0, max = 0x7FFFFFFF){ return this.next() % (max + 1 - min) + min; }
  nextFloat(min = 0.0, max = 1.0){ return parseFloat((this.next() / 0xFFFFFFFF) * (max - min) + min); }
}
export { Xorshift };


/**
 * Shuffle
 */
class Shuffle{
  constructor(seed = [123456789, 362436069, 521288629, 88675123]){
    this.random = new Xorshift(seed);
  }

  /**
   * Fisher–Yates shuffle
   * @param {*} array 
   * @returns shuffled array
   */
  fisherYates(array){
    let i, j ,tmp;
    for(i = array.length - 1; i > 0; i--){
      j = this.random.nextInt(0, i);//j = Math.floor(Math.random() * (i + 1));
      tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }
}
export { Shuffle };


 /**
 * Perlin Noize
 * https://mrl.nyu.edu/~perlin/noise/
 */
class ImprovedNoise{
  constructor(seed = [123456789, 362436069, 521288629, 88675123]){
    this.permutation = [151,160,137,91,90,15,
      131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
      190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
      88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
      77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
      102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
      135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
      5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
      223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
      129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
      251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
      49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
      138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    this.shuffle = new Shuffle(seed);
    this.permutation = this.shuffle.fisherYates(this.permutation);
    this.p = new Uint8ClampedArray(this.permutation.concat(this.permutation));
  }
  fade(t){ return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }//double => double: 4次エルミート曲線(Quintic Hermine Curve)?
  lerp(t, a, b){ return a + t * (b - a); }//double => double: Linear Interpolate
  grad(hash, x, y, z){//int,double --> double
    const h = hash & 15;//CONVERT LO 4 BITS OF HASH CODE
    const u = h < 8 ? x : y;//INTO 12 GRADIENT DIRECTIONS.
    const v = h < 4 ? y : (h === 12 || h === 14) ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /**
   * for(let y = 0; y < height; y++){
   *   for(let x = 0; x < width; x++){
   *     color = 128 + this.noise(x / 10, y / 10, 0) * 128;
   *   }
   * }
   * @param {number} x 
   * @param {number} y 
   * @param {number} z 
   * @returns {number} -1.0 ~ 1.0
   */
  noise(x, y, z){
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;//int: FIND UNIT CUBE THAT CONTAINS POINT.
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);//FIND RELATIVE X,Y,Z OF POINT IN CUBE.
    const u = this.fade(x), v = this.fade(y), w = this.fade(z);//double: COMPUTE FADE CURVES FOR EACH OF X,Y,Z.
    const
    A = this.p[X]  +Y, AA = this.p[A]+Z, AB = this.p[A+1]+Z,
    B = this.p[X+1]+Y, BA = this.p[B]+Z, BB = this.p[B+1]+Z;//int: HASH COORDINATES OF THE 8 CUBE CORNERS,
    return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA  ], x, y  , z  ), this.grad(this.p[BA  ], x-1, y  , z  )),
                                     this.lerp(u, this.grad(this.p[AB  ], x, y-1, z  ), this.grad(this.p[BB  ], x-1, y-1, z  ))),
                        this.lerp(v, this.lerp(u, this.grad(this.p[AA+1], x, y  , z-1), this.grad(this.p[BA+1], x-1, y  , z-1)),
                                     this.lerp(u, this.grad(this.p[AB+1], x, y-1, z-1), this.grad(this.p[BB+1], x-1, y-1, z-1)))
    );//AND ADD BLENDED RESULTS FROM 8 CORNERS OF CUBE
  }

  /**
   * Seamlessly tiling noise
   * https://mzucker.github.io/html/perlin-noise-math-faq.html#tile
   * tileable 2-dimensional noise that repeats every w units in the x dimension and every h units in the y dimension.
   * https://gamedev.stackexchange.com/questions/23625/how-do-you-generate-tileable-perlin-noise
   */
  seamless(x, y, z, w, h){
    return (
      this.noise(x,   y,   z) * (w-x) * (h-y) +
      this.noise(x-w, y,   z) *    x  * (h-y) +
      this.noise(x-w, y-h, z) *    x  *    y  +
      this.noise(x,   y-h, z) * (w-x) *    y
    ) / (w * h);
  }

  /**
   * @param {number} width 
   * @param {number} height 
   * @param {number} smoothness 
   * @param {number} z 
   * @returns {number} -1.0 ~ 1.0
   */
  seamless2d(width, height, smoothness, z){
    let n = [];
    const w = width / smoothness;
    const h = height / smoothness;
    //z = z / smoothness;
    for(let y = 0; y < height; y++){
      for(let x = 0; x < width; x++){
        n.push(this.seamless(x / smoothness, y / smoothness, z, w, h));
      }
    }
    return n;
  }

  seamless3d(width, height, smoothness, z, t){
    let n = [];
    const w = width / smoothness;
    const h = height / smoothness;
    let x, y;
    z = z % t;
    for(let j = 0; j < height; j++){
      y = j / smoothness;
      for(let i = 0; i < width; i++){
        x = i / smoothness;
        n.push((
          this.seamless(x, y, z,     w, h) * (t - z) +
          this.seamless(x, y, z - t, w, h) *      z
        ) / t);
      }
    }
    return n;
  }
}
export { ImprovedNoise };
