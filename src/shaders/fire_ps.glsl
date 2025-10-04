uniform sampler2D diffuseTexture;

varying vec2  _textureOffset;
varying vec2  _textureRepeat;

void main() {
  gl_FragColor = texture2D(diffuseTexture, (gl_PointCoord * _textureRepeat) + _textureOffset);
}