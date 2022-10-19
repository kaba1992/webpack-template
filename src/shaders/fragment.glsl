

varying vec2 vUv;
uniform sampler2D videoTexture;
void main()
{
    gl_FragColor = texture2D(videoTexture, vUv);
}
