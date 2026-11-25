import{n as e}from"./rolldown-runtime-4tVxZq34.js";import{$ as t,$i as n,$n as r,A as i,Ar as a,B as o,Bn as s,Ca as c,Cn as l,Cr as u,Ct as d,D as f,Da as p,Dn as m,Dr as h,E as g,Ea as _,En as v,F as y,Fn as b,Fr as x,Ft as S,Gi as C,Gn as w,Hn as T,Hr as E,I as D,Ii as ee,In as O,Ir as k,Jn as A,Jr as j,Ki as M,Kn as te,L as ne,Li as re,Lr as ie,M as ae,Mi as oe,Mn as se,Mr as ce,N as le,Ni as ue,Nn as de,Nt as fe,O as pe,Oa as me,On as he,Or as ge,Ot as _e,P as ve,Pn as ye,Q as be,Qn as xe,R as Se,Ri as Ce,Rr as we,Sa as Te,Sn as Ee,Sr as De,St as Oe,Ta as ke,Tn as Ae,Tr as je,Tt as Me,Ur as Ne,Vn as N,Vr as P,Wi as Pe,Wn as Fe,Wr as Ie,X as Le,Xn as F,Xr as Re,Y as I,Yn as L,Z as R,Zi as ze,Zn as Be,_a as Ve,_t as He,an as Ue,ar as We,at as Ge,ba as Ke,bn as z,bt as qe,ca as Je,cn as B,cr as Ye,ct as Xe,da as Ze,dr as V,dt as H,ei as Qe,en as $e,er as et,fa as tt,fr as nt,ft as rt,ga as it,gn as at,gt as ot,ha as st,hn as ct,ht as lt,ia as ut,ir as dt,it as ft,j as pt,ji as mt,jr as ht,k as gt,ka as _t,kn as vt,kr as yt,la as bt,lr as xt,lt as St,ma as Ct,mt as wt,na as Tt,nn as Et,nr as Dt,oa as Ot,on as kt,or as At,pa as jt,pr as Mt,pt as Nt,qi as Pt,qt as Ft,ra as It,rr as Lt,rt as Rt,ta as zt,ti as Bt,tt as Vt,ua as Ht,ut as Ut,v as Wt,va as Gt,vn as Kt,vr as qt,vt as Jt,w as Yt,wa as Xt,wn as U,wr as Zt,wt as Qt,x as $t,xa as en,xn as tn,xr as nn,xt as rn,y as an,ya as on,yn as W,yt as sn,z as cn,zr as ln}from"./roster-DKor7g8q.js";function un(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function dn(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var fn={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},G={common:{diffuse:{value:new N(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new h},alphaMap:{value:null},alphaMapTransform:{value:new h},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new h}},envmap:{envMap:{value:null},envMapRotation:{value:new h},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new h}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new h}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new h},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new h},normalScale:{value:new tt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new h},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new h}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new h}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new h}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new N(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new N(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new h},alphaTest:{value:0},uvTransform:{value:new h}},sprite:{diffuse:{value:new N(16777215)},opacity:{value:1},center:{value:new tt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new h},alphaMap:{value:null},alphaMapTransform:{value:new h},alphaTest:{value:0}}},pn={basic:{uniforms:_([G.common,G.specularmap,G.envmap,G.aomap,G.lightmap,G.fog]),vertexShader:fn.meshbasic_vert,fragmentShader:fn.meshbasic_frag},lambert:{uniforms:_([G.common,G.specularmap,G.envmap,G.aomap,G.lightmap,G.emissivemap,G.bumpmap,G.normalmap,G.displacementmap,G.fog,G.lights,{emissive:{value:new N(0)},envMapIntensity:{value:1}}]),vertexShader:fn.meshlambert_vert,fragmentShader:fn.meshlambert_frag},phong:{uniforms:_([G.common,G.specularmap,G.envmap,G.aomap,G.lightmap,G.emissivemap,G.bumpmap,G.normalmap,G.displacementmap,G.fog,G.lights,{emissive:{value:new N(0)},specular:{value:new N(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:fn.meshphong_vert,fragmentShader:fn.meshphong_frag},standard:{uniforms:_([G.common,G.envmap,G.aomap,G.lightmap,G.emissivemap,G.bumpmap,G.normalmap,G.displacementmap,G.roughnessmap,G.metalnessmap,G.fog,G.lights,{emissive:{value:new N(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:fn.meshphysical_vert,fragmentShader:fn.meshphysical_frag},toon:{uniforms:_([G.common,G.aomap,G.lightmap,G.emissivemap,G.bumpmap,G.normalmap,G.displacementmap,G.gradientmap,G.fog,G.lights,{emissive:{value:new N(0)}}]),vertexShader:fn.meshtoon_vert,fragmentShader:fn.meshtoon_frag},matcap:{uniforms:_([G.common,G.bumpmap,G.normalmap,G.displacementmap,G.fog,{matcap:{value:null}}]),vertexShader:fn.meshmatcap_vert,fragmentShader:fn.meshmatcap_frag},points:{uniforms:_([G.points,G.fog]),vertexShader:fn.points_vert,fragmentShader:fn.points_frag},dashed:{uniforms:_([G.common,G.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:fn.linedashed_vert,fragmentShader:fn.linedashed_frag},depth:{uniforms:_([G.common,G.displacementmap]),vertexShader:fn.depth_vert,fragmentShader:fn.depth_frag},normal:{uniforms:_([G.common,G.bumpmap,G.normalmap,G.displacementmap,{opacity:{value:1}}]),vertexShader:fn.meshnormal_vert,fragmentShader:fn.meshnormal_frag},sprite:{uniforms:_([G.sprite,G.fog]),vertexShader:fn.sprite_vert,fragmentShader:fn.sprite_frag},background:{uniforms:{uvTransform:{value:new h},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:fn.background_vert,fragmentShader:fn.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new h}},vertexShader:fn.backgroundCube_vert,fragmentShader:fn.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:fn.cube_vert,fragmentShader:fn.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:fn.equirect_vert,fragmentShader:fn.equirect_frag},distance:{uniforms:_([G.common,G.displacementmap,{referencePosition:{value:new jt},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:fn.distance_vert,fragmentShader:fn.distance_frag},shadow:{uniforms:_([G.lights,G.fog,{color:{value:new N(0)},opacity:{value:1}}]),vertexShader:fn.shadow_vert,fragmentShader:fn.shadow_frag}};pn.physical={uniforms:_([pn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new h},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new h},clearcoatNormalScale:{value:new tt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new h},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new h},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new h},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new h},sheen:{value:0},sheenColor:{value:new N(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new h},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new h},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new h},transmissionSamplerSize:{value:new tt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new h},attenuationDistance:{value:0},attenuationColor:{value:new N(0)},specularColor:{value:new N(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new h},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new h},anisotropyVector:{value:new tt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new h}}]),vertexShader:fn.meshphysical_vert,fragmentShader:fn.meshphysical_frag};var mn={r:0,b:0,g:0},hn=new ge,gn=new h;gn.set(-1,0,0,0,1,0,0,0,1);function _n(e,t,n,r,i,a){let o=new N(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&i.isCubeTexture?(l===void 0&&(l=new yt(new ye(1,1,1),new Pt({name:`BackgroundCubeMaterial`,uniforms:Gt(pn.backgroundCube.uniforms),vertexShader:pn.backgroundCube.vertexShader,fragmentShader:pn.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(hn.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(gn),l.material.toneMapped=T.getTransfer(i.colorSpace)!==C,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new yt(new Ie(2,2),new Pt({name:`BackgroundMaterial`,uniforms:Gt(pn.background.uniforms),vertexShader:pn.background.vertexShader,fragmentShader:pn.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=T.getTransfer(i.colorSpace)!==C,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(mn,Xt(e)),n.buffers.color.setClear(mn.r,mn.g,mn.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function vn(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.isInterleavedBuffer===!0?t.stride:t.itemSize,p=s.offset;if(t.isInstancedInterleavedBuffer||t.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function yn(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function bn(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(me(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`),f=n.logarithmicDepthBuffer===!0&&d===!1;n.reversedDepthBuffer===!0&&d===!1&&me(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`),n.logarithmicDepthBuffer===!0&&d===!0&&me(`WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function xn(e){let t=this,n=null,r=0,i=!1,a=!1,o=new Ne,s=new h,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var Sn=class extends it{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new te(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new ye(5,5,5),i=new Pt({name:`CubemapFromEquirect`,uniforms:Gt(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new yt(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=nn),new Fe(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}},Cn=256,wn=3,Tn=20,En=256,Dn=16,On=3,kn=new jt,An=new N,jn=class e{constructor(e){this._renderer=e,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new Fe(1,10,null),this._boxMesh=new yt(new ye(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=kn}=i,s=this._renderer;this._setSize(a);let c=this._allocateTarget(),l=this._getSourceTarget(!0);t>0&&(l.texture.mipmapsAutoUpdate=!1);let u=s.autoClear,d=s.autoClearColor,f=s.autoClearDepth,p=s.autoClearStencil,m=e.background;s.autoClear=!0,s.autoClearColor=!0,s.autoClearDepth=!0,s.autoClearStencil=!0,m===null&&(e.background=s.getClearColor(An));let h=new Fe(n,r,l);return h.position.copy(o),h.update(s,e),s.autoClear=u,s.autoClearColor=d,s.autoClearDepth=f,s.autoClearStencil=p,e.background=m,t>0&&(l.texture.mipmapsAutoUpdate=!0,this._blur(c,t)),this._applyPMREM(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Rn(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ln(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(e,t){return t>0?1-Math.sqrt(1-e/t):0}_setSize(e){this._cubeSize=Math.max(Cn,Te(e))}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?Cn:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4);let n=t||this._allocateTarget();return this._textureToCubemap(e),this._applyPMREM(n),n}_allocateTarget(){let e=this._cubeSize,t=Mn(e,!1,!1),n=Math.log2(e)-wn;for(let r=0;r<=n;r++)t.texture.mipmaps.push({width:e>>r,height:e>>r});return t.texture.name=`PMREM`,t.texture.isPMREMTexture=!0,t}_getSourceTarget(e=!1){let t=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==t||e&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=Mn(t,!0,e)),this._sourceTarget}_compileMaterial(e){this._boxMesh.material=e,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(e,t,n){let r=this._boxMesh,i=this._cubeCamera;r.material=n,i.renderTarget=e,i.activeMipmapLevel=t;let a=e.width>>t;e.viewport.set(0,0,a,a),i.update(this._renderer,r),e.viewport.set(0,0,e.width,e.height)}_textureToCubemap(e){let t;e.mapping===301||e.mapping===302?(this._cubemapMaterial===null&&(this._cubemapMaterial=Rn()),t=this._cubemapMaterial,t.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=Ln()),t=this._equirectMaterial),t.uniforms.envMap.value=e,this._renderCube(this._getSourceTarget(),0,t)}_applyPMREM(t){this._ggxMaterial===null&&(this._ggxMaterial=Pn(),this._integrationMaterial=Fn());let n=this._cubeSize,r=t.texture.mipmaps.length-1,i=this._ggxMaterial.uniforms;i.envMap.value=this._sourceTarget.texture;let a=this._integrationMaterial.uniforms;a.envMap.value=this._sourceTarget.texture,a.sourceLod.value=Math.log2(n/Dn);for(let o=0;o<=r;o++){let s=e.lodToRoughness(o,r);if(o>r-On)a.roughness.value=s,this._renderCube(t,o,this._integrationMaterial);else{let e=s>0?Math.log2(n)+.5*Math.log2(6/(En*s**4))+.5:0;i.roughness.value=s,i.lodBias.value=e,this._renderCube(t,o,this._ggxMaterial)}}}_blur(e,t){this._blurMaterial===null&&(this._blurMaterial=In());let n=this._blurMaterial,r=n.uniforms,i=this._sourceTarget;r.sigma.value=Math.min(t,Math.PI)/Math.SQRT2,r.envMap.value=i.texture,this._renderCube(e,0,n),r.envMap.value=e.texture,this._renderCube(i,0,n)}};function Mn(e,t,n){return new Sn(e,{minFilter:De,generateMipmaps:t,type:nt,colorSpace:Zt,depthBuffer:n})}function Nn(e,t,n){return new Pt({name:e,uniforms:t,vertexShader:fn.cube_vert,fragmentShader:n,side:1,blending:0,depthTest:!1,depthWrite:!1})}function Pn(){return Nn(`PMREMGGXConvolution`,{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${En}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Fn(){return Nn(`PMREMGGXIntegration`,{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:Dn}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function In(){return Nn(`PMREMSphericalGaussianBlur`,{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${Tn}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function Ln(){return Nn(`PMREMEquirectangularToCubemap`,{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function Rn(){return Nn(`PMREMCubemapToCubemap`,{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function zn(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new Sn(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture&&t.isPMREMTexture!==!0){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new jn(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new jn(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Bn(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&_t(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Vn(e,t,n,r){let i={},a=new WeakMap,o=new FinalizationRegistry(e=>delete i[e]);function s(e){c(e.target)}function c(e){e.index!==null&&t.remove(e.index);for(let n in e.attributes)t.remove(e.attributes[n]);e.removeEventListener(`dispose`,s),delete i[e.id],o.unregister(e);let c=a.get(e);c&&(t.remove(c),a.delete(e)),r.releaseStatesOfGeometry(e),e.isInstancedBufferGeometry===!0&&delete e._maxInstanceCount,n.memory.geometries--}function l(e,t){return i[t.id]===void 0&&(t.addEventListener(`dispose`,s),i[t.id]=new WeakRef(t),o.register(t,t.id,t),n.memory.geometries++),t}function u(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function d(e){let n=e.index,r=e.attributes.position,i=0;if(r===void 0)return;let o=n===null?r.array.length/3-1:n.array.length,s=new(r.count>=65535?Tt:zt)(Math.ceil(o/3)*6,1),c=s.array;if(n!==null){let e=n.array;i=n.version;for(let t=0,n=0;t<o;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];c[n++]=r,c[n++]=i,c[n++]=i,c[n++]=a,c[n++]=a,c[n++]=r}}else{i=r.version;for(let e=0,t=0;e<o;e+=3){let n=e+0,r=e+1,i=e+2;c[t++]=n,c[t++]=r,c[t++]=r,c[t++]=i,c[t++]=i,c[t++]=n}}s.version=i;let l=a.get(e);l&&t.remove(l),a.set(e,s)}function f(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&d(e)}else d(e);return a.get(e)}function p(){for(let e in i){let t=i[e].deref();t!==void 0&&c(t)}}return{get:l,update:u,getWireframeAttribute:f,dispose:p}}function Hn(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Un(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:en(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function Wn(e,t,n){let r=new WeakMap,i=new Ct;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new L(h,p,m,u);g.type=At,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new tt(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function Gn(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var Kn={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function qn(e,t,n,i,a,o){let s=new it(t,n,{type:e,depthBuffer:a,stencilBuffer:o,samples:i?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),c=null,l=null,u=null,d=new O;d.setAttribute(`position`,new We([-1,3,0,-1,-1,0,3,-1,0],3)),d.setAttribute(`uv`,new We([0,2,0,0,2,0],2));let f=new ue({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),p=new yt(d,f),m=new P(-1,1,1,-1,0,1),h=null,g=null,_=!1,v,y=null,b=[],x=!1;this.setSize=function(e,t){s.setSize(e,t),c!==null&&c.setSize(e,t),l!==null&&l.setSize(e,t);for(let n=0;n<b.length;n++){let r=b[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){b=e,x=b.length>0&&b[0].isRenderPass===!0;let t=s.width,n=s.height;b.length>0&&c===null&&(c=new it(t,n,{type:nt,depthBuffer:!1,stencilBuffer:!1}),l=new it(t,n,{type:nt,depthBuffer:!1,stencilBuffer:!1}));let i=a===!0&&b.some(e=>e.needsDepthTexture===!0);i!==(s.depthTexture!==null)&&(i===!0&&u===null&&(u=new r(t,n),o===!0&&(u.format=xe,u.type=Ot)),s.dispose(),s.depthTexture=i?u:null,s.resolveDepthBuffer=i,s.storeMultisampledDepthBuffer=i);for(let e=0;e<b.length;e++){let r=b[e];r.setSize&&r.setSize(t,n),i&&r.needsDepthTexture===!0&&r.setDepthTexture&&r.setDepthTexture(u)}},this.begin=function(e,t){if(_||e.toneMapping===0&&b.length===0)return!1;if(y=t,t!==null){let e=t.width,n=t.height;(s.width!==e||s.height!==n)&&this.setSize(e,n)}return x===!1&&e.setRenderTarget(s),v=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return x},this.end=function(e,t){e.toneMapping=v,_=!0;let n=s,r=c;for(let i=0;i<b.length;i++){let a=b[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===c?l:c))}if(h!==e.outputColorSpace||g!==e.toneMapping){h=e.outputColorSpace,g=e.toneMapping,f.defines={},T.getTransfer(h)===`srgb`&&(f.defines.SRGB_TRANSFER=``);let t=Kn[g];t&&(f.defines[t]=``),f.needsUpdate=!0}f.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(y),e.render(p,m),y=null,_=!1},this.isCompositing=function(){return _},this.dispose=function(){s.dispose(),c!==null&&c.dispose(),l!==null&&l.dispose(),d.dispose(),f.dispose()}}var Jn=new n,Yn=new r(1,1),Xn=new w(1),Zn=new L,Qn=new A,$n=new te,er=[],tr=[],nr=new Float32Array(16),rr=new Float32Array(9),ir=new Float32Array(4);function ar(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=er[i];if(a===void 0&&(a=new Float32Array(i),er[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function or(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function sr(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function cr(e,t){let n=tr[t];n===void 0&&(n=new Int32Array(t),tr[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function lr(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function ur(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(or(n,t))return;e.uniform2fv(this.addr,t),sr(n,t)}}function dr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(or(n,t))return;e.uniform3fv(this.addr,t),sr(n,t)}}function fr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(or(n,t))return;e.uniform4fv(this.addr,t),sr(n,t)}}function pr(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(or(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),sr(n,t)}else{if(or(n,r))return;ir.set(r),e.uniformMatrix2fv(this.addr,!1,ir),sr(n,r)}}function mr(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(or(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),sr(n,t)}else{if(or(n,r))return;rr.set(r),e.uniformMatrix3fv(this.addr,!1,rr),sr(n,r)}}function hr(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(or(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),sr(n,t)}else{if(or(n,r))return;nr.set(r),e.uniformMatrix4fv(this.addr,!1,nr),sr(n,r)}}function gr(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function _r(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(or(n,t))return;e.uniform2iv(this.addr,t),sr(n,t)}}function vr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(or(n,t))return;e.uniform3iv(this.addr,t),sr(n,t)}}function yr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(or(n,t))return;e.uniform4iv(this.addr,t),sr(n,t)}}function br(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function xr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(or(n,t))return;e.uniform2uiv(this.addr,t),sr(n,t)}}function Sr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(or(n,t))return;e.uniform3uiv(this.addr,t),sr(n,t)}}function Cr(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(or(n,t))return;e.uniform4uiv(this.addr,t),sr(n,t)}}function wr(e){return e.version===0&&(e.compareFunction=519,e.needsUpdate=!0),e}function Tr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_2D_SHADOW?wr(Yn):Jn,n.setTexture2D(t||a,i)}function Er(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||Qn,i)}function Dr(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_CUBE_SHADOW?wr(Xn):$n,n.setTextureCube(t||a,i)}function Or(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||Zn,i)}function kr(e){switch(e){case 5126:return lr;case 35664:return ur;case 35665:return dr;case 35666:return fr;case 35674:return pr;case 35675:return mr;case 35676:return hr;case 5124:case 35670:return gr;case 35667:case 35671:return _r;case 35668:case 35672:return vr;case 35669:case 35673:return yr;case 5125:return br;case 36294:return xr;case 36295:return Sr;case 36296:return Cr;case 35678:case 36198:case 36298:case 36306:case 35682:return Tr;case 35679:case 36299:case 36307:return Er;case 35680:case 36300:case 36308:case 36293:return Dr;case 36289:case 36303:case 36311:case 36292:return Or}}function Ar(e,t){e.uniform1fv(this.addr,t)}function jr(e,t){let n=ar(t,this.size,2);e.uniform2fv(this.addr,n)}function Mr(e,t){let n=ar(t,this.size,3);e.uniform3fv(this.addr,n)}function Nr(e,t){let n=ar(t,this.size,4);e.uniform4fv(this.addr,n)}function Pr(e,t){let n=ar(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Fr(e,t){let n=ar(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Ir(e,t){let n=ar(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Lr(e,t){e.uniform1iv(this.addr,t)}function Rr(e,t){e.uniform2iv(this.addr,t)}function zr(e,t){e.uniform3iv(this.addr,t)}function Br(e,t){e.uniform4iv(this.addr,t)}function Vr(e,t){e.uniform1uiv(this.addr,t)}function Hr(e,t){e.uniform2uiv(this.addr,t)}function Ur(e,t){e.uniform3uiv(this.addr,t)}function Wr(e,t){e.uniform4uiv(this.addr,t)}function Gr(e,t,n){let r=this.cache,i=t.length,a=cr(n,i);or(r,a)||(e.uniform1iv(this.addr,a),sr(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?wr(Yn):Jn;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function Kr(e,t,n){let r=this.cache,i=t.length,a=cr(n,i);or(r,a)||(e.uniform1iv(this.addr,a),sr(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||Qn,a[e])}function qr(e,t,n){let r=this.cache,i=t.length,a=cr(n,i);or(r,a)||(e.uniform1iv(this.addr,a),sr(r,a));let o;o=this.type===e.SAMPLER_CUBE_SHADOW?wr(Xn):$n;for(let e=0;e!==i;++e)n.setTextureCube(t[e]||o,a[e])}function Jr(e,t,n){let r=this.cache,i=t.length,a=cr(n,i);or(r,a)||(e.uniform1iv(this.addr,a),sr(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||Zn,a[e])}function Yr(e){switch(e){case 5126:return Ar;case 35664:return jr;case 35665:return Mr;case 35666:return Nr;case 35674:return Pr;case 35675:return Fr;case 35676:return Ir;case 5124:case 35670:return Lr;case 35667:case 35671:return Rr;case 35668:case 35672:return zr;case 35669:case 35673:return Br;case 5125:return Vr;case 36294:return Hr;case 36295:return Ur;case 36296:return Wr;case 35678:case 36198:case 36298:case 36306:case 35682:return Gr;case 35679:case 36299:case 36307:return Kr;case 35680:case 36300:case 36308:case 36293:return qr;case 36289:case 36303:case 36311:case 36292:return Jr}}var Xr=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=kr(t.type)}},Zr=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Yr(t.type)}},Qr=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},$r=/(\w+)(\])?(\[|\.)?/g;function ei(e,t){e.seq.push(t),e.map[t.id]=t}function ti(e,t,n){let r=e.name,i=r.length;for($r.lastIndex=0;;){let a=$r.exec(r),o=$r.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){ei(n,l===void 0?new Xr(s,e,t):new Zr(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new Qr(s),ei(n,e)),n=e}}}var ni=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);ti(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function ri(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var ii=37297,ai=0;function oi(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var si=new h;function ci(e){T._getMatrix(si,T.workingColorSpace,e);let t=`mat3( ${si.elements.map(e=>e.toFixed(4))} )`;switch(T.getTransfer(e)){case je:return[t,`LinearTransferOETF`];case C:return[t,`sRGBTransferOETF`];default:return me(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function li(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+oi(e.getShaderSource(t),r)}return i}function ui(e,t){let n=ci(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( ${n[0]} * value.rgb, value.a ) );`,`}`].join(`
`)}var di={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function fi(e,t){let n=di[t];return n===void 0?(me(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var pi=new jt;function mi(){return T.getLuminanceCoefficients(pi),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${pi.x.toFixed(4)}, ${pi.y.toFixed(4)}, ${pi.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function hi(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(vi).join(`
`)}function gi(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function _i(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function vi(e){return e!==``}function yi(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,t.numLightProbeGrids)}function bi(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var xi=/^[ \t]*#include +<([\w\d./]+)>/gm;function Si(e){return e.replace(xi,Ci)}function Ci(e,t){let n=fn[t];if(n===void 0)throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`);return Si(n)}var wi=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ti(e){return e.replace(wi,Ei)}function Ei(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function Di(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var Oi={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function ki(e){return Oi[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Ai={302:`ENVMAP_MODE_REFRACTION`};function ji(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Ai[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var Mi={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function Ni(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:Mi[e.combine]||`ENVMAP_BLENDING_NONE`}function Pi(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=ki(n),l=n.envMapPMREM===!0?`ENVMAP_TYPE_PMREM`:`ENVMAP_TYPE_CUBE`,u=ji(n),d=Ni(n),f=hi(n),p=gi(a),m=i.createProgram(),h,g,_=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(h=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(vi).join(`
`),h.length>0&&(h+=`
`),g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(vi).join(`
`),g.length>0&&(g+=`
`)):(h=[Di(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.diffuseRoughnessMapUv?`#define DIFFUSE_ROUGHNESSMAP_UV `+n.diffuseRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(vi).join(`
`),g=[Di(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,n.envMapPMREM?`#define ENVMAP_MAX_LOD `+n.envMapMaxLod+`.0`:``,n.envMapPMREM?`#define ENVMAP_SIZE `+n.envMapSize+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughness?`#define USE_DIFFUSE_ROUGHNESS`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.retroreflection?`#define USE_RETROREFLECTION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:fn.tonemapping_pars_fragment,n.toneMapping===0?``:fi(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,fn.colorspace_pars_fragment,ui(`linearToOutputTexel`,n.outputColorSpace),mi(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(vi).join(`
`)),o=Si(o),o=yi(o,n),o=bi(o,n),s=Si(s),s=yi(s,n),s=bi(s,n),o=Ti(o),s=Ti(s),n.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,h=[f,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+h,g=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+g);let v=_+h+o,y=_+g+s,b=ri(i,i.VERTEX_SHADER,v),x=ri(i,i.FRAGMENT_SHADER,y);i.attachShader(m,b),i.attachShader(m,x),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(m,0,`position`):i.bindAttribLocation(m,0,n.index0AttributeName),i.linkProgram(m);function S(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(m)||``,r=i.getShaderInfoLog(b)||``,a=i.getShaderInfoLog(x)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(m,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,m,b,x);else{let e=li(i,b,`vertex`),n=li(i,x,`fragment`);en(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(m,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):me(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:h},fragmentShader:{log:c,prefix:g}})}i.deleteShader(b),i.deleteShader(x),C=new ni(i,m),w=_i(i,m)}let C;this.getUniforms=function(){return C===void 0&&S(this),C};let w;this.getAttributes=function(){return w===void 0&&S(this),w};let T=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return T===!1&&(T=i.getProgramParameter(m,ii)),T},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(m),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=ai++,this.cacheKey=t,this.usedTimes=1,this.program=m,this.vertexShader=b,this.fragmentShader=x,this}var Fi=0,Ii=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Li(e),t.set(e,n)),n}},Li=class{constructor(e){this.id=Fi++,this.code=e,this.usedTimes=0}};function Ri(e){return e===1030||e===37490||e===36285}function zi(e,t,n,r,i,a){let o=new qt,s=new Ii,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function p(e){return c.add(e),e===0?`uv`:`uv${e}`}function m(i,o,l,u,m,h){let g=u.fog,_=m.geometry,v=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,b=t.get(i.envMap||v,y),x=f[i.type],S=r.precision;i.precision!==null&&(S=r.getMaxPrecision(i.precision),S!==i.precision&&me(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,S,`instead.`));let C=_.morphAttributes.position||_.morphAttributes.normal||_.morphAttributes.color,w=C===void 0?0:C.length,E=0;_.morphAttributes.position!==void 0&&(E=1),_.morphAttributes.normal!==void 0&&(E=2),_.morphAttributes.color!==void 0&&(E=3);let D,ee,O,k;if(x){let e=pn[x];D=e.vertexShader,ee=e.fragmentShader}else{D=i.vertexShader,ee=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),O=e.id,k=t.id}let A=e.getRenderTarget(),j=e.state.buffers.depth.getReversed(),M=m.isInstancedMesh===!0,te=m.isBatchedMesh===!0,ne=!!i.map,re=!!i.matcap,ie=!!b,ae=ie&&b.isPMREMTexture===!0,oe=!!i.aoMap,se=!!i.lightMap,ce=!!i.bumpMap&&i.wireframe===!1,le=!!i.normalMap,ue=!!i.displacementMap,de=!!i.emissiveMap,fe=!!i.metalnessMap,pe=!!i.roughnessMap,he=i.anisotropy>0,ge=i.clearcoat>0,_e=i.diffuseRoughness>0,ve=i.dispersion>0,ye=i.retroreflectivity>0,be=i.iridescence>0,xe=i.sheen>0,Se=i.transmission>0,Ce=he&&!!i.anisotropyMap,we=ge&&!!i.clearcoatMap,Te=ge&&!!i.clearcoatNormalMap,Ee=ge&&!!i.clearcoatRoughnessMap,De=_e&&!!i.diffuseRoughnessMap,Oe=be&&!!i.iridescenceMap,ke=be&&!!i.iridescenceThicknessMap,Ae=xe&&!!i.sheenColorMap,je=xe&&!!i.sheenRoughnessMap,Me=!!i.specularMap,Ne=!!i.specularColorMap,N=!!i.specularIntensityMap,P=Se&&!!i.transmissionMap,Pe=Se&&!!i.thicknessMap,Fe=!!i.gradientMap,Ie=!!i.alphaMap,Le=i.alphaTest>0,F=!!i.alphaHash,Re=!!i.extensions,I=0;i.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(I=e.toneMapping);let L=ae?b.isCompressedCubeTexture?b.image[0].mipmaps:b.mipmaps:null,R={shaderID:x,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:ee,defines:i.defines,customVertexShaderID:O,customFragmentShaderID:k,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:S,batching:te,batchingColor:te&&m._colorsTexture!==null,instancing:M,instancingColor:M&&m.instanceColor!==null,instancingMorph:M&&m.morphTexture!==null,outputColorSpace:A===null?e.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:T.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:ne,matcap:re,envMap:ie,envMapMode:ie&&b.mapping,envMapPMREM:ae,envMapMaxLod:ae?L.length-1:null,envMapSize:ae?L[0].width:null,aoMap:oe,lightMap:se,bumpMap:ce,normalMap:le,displacementMap:ue,emissiveMap:de,normalMapObjectSpace:le&&i.normalMapType===1,normalMapTangentSpace:le&&i.normalMapType===0,packedNormalMap:le&&i.normalMapType===0&&Ri(i.normalMap.format),metalnessMap:fe,roughnessMap:pe,anisotropy:he,anisotropyMap:Ce,clearcoat:ge,clearcoatMap:we,clearcoatNormalMap:Te,clearcoatRoughnessMap:Ee,diffuseRoughness:_e,diffuseRoughnessMap:De,dispersion:ve,retroreflection:ye,iridescence:be,iridescenceMap:Oe,iridescenceThicknessMap:ke,sheen:xe,sheenColorMap:Ae,sheenRoughnessMap:je,specularMap:Me,specularColorMap:Ne,specularIntensityMap:N,transmission:Se,transmissionMap:P,thicknessMap:Pe,gradientMap:Fe,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Ie,alphaTest:Le,alphaHash:F,combine:i.combine,mapUv:ne&&p(i.map.channel),aoMapUv:oe&&p(i.aoMap.channel),lightMapUv:se&&p(i.lightMap.channel),bumpMapUv:ce&&p(i.bumpMap.channel),normalMapUv:le&&p(i.normalMap.channel),displacementMapUv:ue&&p(i.displacementMap.channel),emissiveMapUv:de&&p(i.emissiveMap.channel),metalnessMapUv:fe&&p(i.metalnessMap.channel),roughnessMapUv:pe&&p(i.roughnessMap.channel),anisotropyMapUv:Ce&&p(i.anisotropyMap.channel),clearcoatMapUv:we&&p(i.clearcoatMap.channel),clearcoatNormalMapUv:Te&&p(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ee&&p(i.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:De&&p(i.diffuseRoughnessMap.channel),iridescenceMapUv:Oe&&p(i.iridescenceMap.channel),iridescenceThicknessMapUv:ke&&p(i.iridescenceThicknessMap.channel),sheenColorMapUv:Ae&&p(i.sheenColorMap.channel),sheenRoughnessMapUv:je&&p(i.sheenRoughnessMap.channel),specularMapUv:Me&&p(i.specularMap.channel),specularColorMapUv:Ne&&p(i.specularColorMap.channel),specularIntensityMapUv:N&&p(i.specularIntensityMap.channel),transmissionMapUv:P&&p(i.transmissionMap.channel),thicknessMapUv:Pe&&p(i.thicknessMap.channel),alphaMapUv:Ie&&p(i.alphaMap.channel),vertexTangents:!!_.attributes.tangent&&(le||he),vertexNormals:!!_.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!_.attributes.color&&_.attributes.color.itemSize===4,pointsUvs:m.isPoints===!0&&!!_.attributes.uv&&(ne||Ie),fog:!!g,useFog:i.fog===!0,fogExp2:!!g&&g.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||_.attributes.normal===void 0&&le===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:j,skinning:m.isSkinnedMesh===!0,hasPositionAttribute:_.attributes.position!==void 0,morphTargets:_.morphAttributes.position!==void 0,morphNormals:_.morphAttributes.normal!==void 0,morphColors:_.morphAttributes.color!==void 0,morphTargetsCount:w,morphTextureStride:E,numSunLights:o.sun.length,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numSunLightShadows:o.sunShadowMap.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:h.filter(e=>e.texture!==null).length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:I,decodeVideoTexture:ne&&i.map.isVideoTexture===!0&&T.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:de&&i.emissiveMap.isVideoTexture===!0&&T.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:Re&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(Re&&i.extensions.multiDraw===!0||te)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return R.vertexUv1s=c.has(1),R.vertexUv2s=c.has(2),R.vertexUv3s=c.has(3),c.clear(),R}function h(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(g(n,t),_(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function g(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapPMREM),e.push(t.envMapMaxLod),e.push(t.envMapSize),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.diffuseRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.numLightProbeGrids),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function _(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.retroreflection&&o.enable(24),t.diffuseRoughness&&o.enable(25),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function v(e){let t=f[e.type],n;if(t){let e=pn[t];n=It.clone(e.uniforms)}else n=e.uniforms;return n}function y(t,n){let r=u.get(n);return r===void 0?(r=new Pi(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function b(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function x(e){s.remove(e)}function S(){s.dispose()}return{getParameters:m,getProgramCacheKey:h,getUniforms:v,acquireProgram:y,releaseProgram:b,releaseShaderCache:x,programs:l,dispose:S}}function Bi(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function Vi(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Hi(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Ui(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||Vi),r.length>1&&r.sort(t||Hi),i.length>1&&i.sort(t||Hi)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function Wi(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new Ui,e.set(t,[i])):n>=r.length?(i=new Ui,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Gi(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new jt,color:new N};break;case`SpotLight`:n={position:new jt,direction:new jt,color:new N,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new jt,color:new N,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new jt,skyColor:new N,groundColor:new N};break;case`RectAreaLight`:n={color:new N,position:new jt,halfWidth:new jt,halfHeight:new jt}}return e[t.id]=n,n}}}function Ki(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new tt};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new tt};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new tt,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var qi=0;function Ji(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function Yi(e){let t=new Gi,n=Ki(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new jt);let i=new jt,a=new ge,o=new ge;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(Ji);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=G.LTC_FLOAT_1,r.rectAreaLTC2=G.LTC_FLOAT_2):(r.rectAreaLTC1=G.LTC_HALF_1,r.rectAreaLTC2=G.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=qi++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function Xi(e){let t=new Yi(e),n=[],r=[],i=[];function a(e){u.camera=e,n.length=0,r.length=0,i.length=0}function o(e){e.isLightProbeGrid?i.push(e):n.push(e)}function s(e){r.push(e)}function c(){t.setup(n),i.sort((e,t)=>e.priority-t.priority||e.id-t.id)}function l(e){t.setupView(n,e)}let u={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:u,setupLights:c,setupLightsView:l,pushLight:o,pushShadow:s}}function Zi(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new Xi(e),t.set(n,[a])):r>=i.length?(a=new Xi(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var Qi=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,$i=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,ea=[new jt(1,0,0),new jt(-1,0,0),new jt(0,1,0),new jt(0,-1,0),new jt(0,0,1),new jt(0,0,-1)],ta=[new jt(0,-1,0),new jt(0,-1,0),new jt(0,0,1),new jt(0,0,-1),new jt(0,-1,0),new jt(0,-1,0)],na=new ge,ra=new jt,ia=new jt;function aa(e,t,n){let i=new Ye,a=new tt,o=new tt,s=new Ct,c=new ht,l=new ce,u={},d=n.maxTextureSize,f={0:1,1:0,2:2},p=new Pt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new tt},radius:{value:4}},vertexShader:Qi,fragmentShader:$i}),m=p.clone();m.defines.HORIZONTAL_PASS=1;let h=new O;h.setAttribute(`position`,new b(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let g=new yt(h,p),_=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let v=this.type;this.render=function(t,n,c){if(_.enabled===!1||_.autoUpdate===!1&&_.needsUpdate===!1||t.length===0)return;this.type===2&&(me(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let l=e.getRenderTarget(),u=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.state;p.setBlending(0),p.buffers.depth.getReversed()===!0?p.buffers.color.setClear(0,0,0,0):p.buffers.color.setClear(1,1,1,1),p.buffers.depth.setTest(!0),p.setScissorTest(!1);let m=v!==this.type;m&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let l=0,u=t.length;l<u;l++){let u=t[l],f=u.shadow;if(f===void 0){me(`WebGLShadowMap:`,u,`has no shadow.`);continue}if(f.autoUpdate===!1&&f.needsUpdate===!1)continue;a.copy(f.mapSize);let h=f.getFrameExtents();a.multiply(h),o.copy(f.mapSize),(a.x>d||a.y>d)&&(a.x>d&&(o.x=Math.floor(d/h.x),a.x=o.x*h.x,f.mapSize.x=o.x),a.y>d&&(o.y=Math.floor(d/h.y),a.y=o.y*h.y,f.mapSize.y=o.y));let g=e.state.buffers.depth.getReversed();if(f.camera._reversedDepth=g,f.map===null||m===!0){if(f.map!==null&&(f.map.depthTexture!==null&&(f.map.depthTexture.dispose(),f.map.depthTexture=null),f.map.dispose()),this.type===3){if(u.isPointLight){me(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}f.map=new it(a.x,a.y,{format:mt,type:nt,minFilter:nn,magFilter:nn,generateMipmaps:!1}),f.map.texture.name=u.name+`.shadowMap`,f.map.depthTexture=new r(a.x,a.y,At),f.map.depthTexture.name=u.name+`.shadowMapDepth`,f.map.depthTexture.format=Be,f.map.depthTexture.compareFunction=null,f.map.depthTexture.minFilter=ie,f.map.depthTexture.magFilter=ie}else u.isPointLight?(f.map=new Sn(a.x),f.map.depthTexture=new w(a.x,Je)):(f.map=new it(a.x,a.y),f.map.depthTexture=new r(a.x,a.y,Je)),f.map.depthTexture.name=u.name+`.shadowMap`,f.map.depthTexture.format=Be,this.type===1?(f.map.depthTexture.compareFunction=g?518:515,f.map.depthTexture.minFilter=nn,f.map.depthTexture.magFilter=nn):(f.map.depthTexture.compareFunction=null,f.map.depthTexture.minFilter=ie,f.map.depthTexture.magFilter=ie);f.camera.updateProjectionMatrix()}f.map.isWebGLCubeRenderTarget!==!0&&(f.map.width!==a.x||f.map.height!==a.y)&&f.map.setSize(a.x,a.y);let _=f.map.isWebGLCubeRenderTarget?6:f.getViewportCount();u.isPointLight!==!0&&f.updateMatrices(u,c);let v=f.camera.layers.mask&4294967294?f.camera.layers:c.layers;for(let t=0;t<_;t++){let r=f.getCamera(t);if(u.isPointLight){let e=f.camera,n=f.matrix,r=u.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),ra.setFromMatrixPosition(u.matrixWorld),e.position.copy(ra),ia.copy(e.position),ia.add(ea[t]),e.up.copy(ta[t]),e.lookAt(ia),e.updateMatrixWorld(),n.makeTranslation(-ra.x,-ra.y,-ra.z),na.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),f._frustum.setFromProjectionMatrix(na,e.coordinateSystem,e.reversedDepth)}if(f.map.isWebGLCubeRenderTarget)e.setRenderTarget(f.map,t),e.clear();else{t===0&&(e.setRenderTarget(f.map),e.clear());let n=f.getViewport(t);s.set(o.x*n.x,o.y*n.y,o.x*n.z,o.y*n.w),p.viewport(s)}i=f.getFrustum(t),S(n,c,r,u,v,this.type)}f.isPointLightShadow!==!0&&this.type===3&&y(f,c),f.needsUpdate=!1}v=this.type,_.needsUpdate=!1,e.setRenderTarget(l,u,f)};function y(n,r){let i=t.update(g);p.defines.VSM_SAMPLES!==n.blurSamples&&(p.defines.VSM_SAMPLES=n.blurSamples,m.defines.VSM_SAMPLES=n.blurSamples,p.needsUpdate=!0,m.needsUpdate=!0),n.mapPass===null?n.mapPass=new it(a.x,a.y,{format:mt,type:nt}):(n.mapPass.width!==n.map.width||n.mapPass.height!==n.map.height)&&n.mapPass.setSize(n.map.width,n.map.height),p.uniforms.shadow_pass.value=n.map.depthTexture,p.uniforms.resolution.value.set(n.map.width,n.map.height),p.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,i,p,g,null),m.uniforms.shadow_pass.value=n.mapPass.texture,m.uniforms.resolution.value.set(n.map.width,n.map.height),m.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,i,m,g,null)}function x(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?l:c,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=u[e];r===void 0&&(r={},u[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,C)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?f[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function S(n,r,a,o,s,c){if(n.visible===!1)return;if(n.layers.test(s)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&c===3)&&(!n.frustumCulled||n.intersectsFrustum(i))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let i=t.update(n),s=n.material;if(Array.isArray(s)){let t=i.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=s[u.materialIndex];if(d&&d.visible){let t=x(n,d,o,c);n.onBeforeShadow(e,n,r,a,i,t,u),e.renderBufferDirect(a,null,i,t,n,u),n.onAfterShadow(e,n,r,a,i,t,u)}}}else if(s.visible){let t=x(n,s,o,c);n.onBeforeShadow(e,n,r,a,i,t,null),e.renderBufferDirect(a,null,i,t,n,null),n.onAfterShadow(e,n,r,a,i,t,null)}}let l=n.children;for(let e=0,t=l.length;e<t;e++)S(l[e],r,a,o,s,c)}function C(e){e.target.removeEventListener(`dispose`,C);for(let t in u){let n=u[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function oa(e,t){function n(){let t=!1,n=new Ct,r=null,i=new Ct(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?de(e.DEPTH_TEST):fe(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=Ce[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?de(e.STENCIL_TEST):fe(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c={},l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new N(0,0,0),T=0,E=!1,D=null,ee=null,O=null,k=null,A=null,j=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),M=!1,te=0,ne=e.getParameter(e.VERSION);ne.indexOf(`WebGL`)===-1?ne.indexOf(`OpenGL ES`)!==-1&&(te=parseFloat(/^OpenGL ES (\d)/.exec(ne)[1]),M=te>=2):(te=parseFloat(/^WebGL (\d)/.exec(ne)[1]),M=te>=1);let re=null,ie={},ae=e.getParameter(e.SCISSOR_BOX),oe=e.getParameter(e.VIEWPORT),se=new Ct().fromArray(ae),ce=new Ct().fromArray(oe);function le(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let ue={};ue[e.TEXTURE_2D]=le(e.TEXTURE_2D,e.TEXTURE_2D,1),ue[e.TEXTURE_CUBE_MAP]=le(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),ue[e.TEXTURE_2D_ARRAY]=le(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),ue[e.TEXTURE_3D]=le(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),de(e.DEPTH_TEST),o.setFunc(3),be(!1),xe(1),de(e.CULL_FACE),ve(0);function de(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function fe(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function pe(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function me(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function he(t){return h!==t&&(e.useProgram(t),h=t,!0)}let ge={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};ge[103]=e.MIN,ge[104]=e.MAX;let _e={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function ve(t,n,r,i,a,o,s,c,l,u){if(t===0)g===!0&&(fe(e.BLEND),g=!1);else if(g===!1&&(de(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:en(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:en(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:en(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:en(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}}else a=a||n,o=o||r,s=s||i,(n!==v||a!==x)&&(e.blendEquationSeparate(ge[n],ge[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(_e[r],_e[i],_e[o],_e[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function ye(t,n){t.side===2?fe(e.CULL_FACE):de(e.CULL_FACE);let r=t.side===1;n&&(r=!r),be(r),t.blending===1&&t.transparent===!1?ve(0):ve(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),we(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?de(e.SAMPLE_ALPHA_TO_COVERAGE):fe(e.SAMPLE_ALPHA_TO_COVERAGE)}function be(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function xe(t){t===0?fe(e.CULL_FACE):(de(e.CULL_FACE),t!==ee&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),ee=t}function Se(t){t!==O&&(M&&e.lineWidth(t),O=t)}function we(t,n,r){t?(de(e.POLYGON_OFFSET_FILL),(k!==n||A!==r)&&(k=n,A=r,o.getReversed()&&(n=-n,r=-r),e.polygonOffset(n,r))):fe(e.POLYGON_OFFSET_FILL)}function Te(t){t?de(e.SCISSOR_TEST):fe(e.SCISSOR_TEST)}function Ee(t){t===void 0&&(t=e.TEXTURE0+j-1),re!==t&&(e.activeTexture(t),re=t)}function De(t,n,r){r===void 0&&(r=re===null?e.TEXTURE0+j-1:re);let i=ie[r];i===void 0&&(i={type:void 0,texture:void 0},ie[r]=i),(i.type!==t||i.texture!==n)&&(re!==r&&(e.activeTexture(r),re=r),e.bindTexture(t,n||ue[t]),i.type=t,i.texture=n)}function Oe(){let t=ie[re];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function ke(){try{e.compressedTexImage2D(...arguments)}catch(e){en(`WebGLState:`,e)}}function Ae(){try{e.compressedTexImage3D(...arguments)}catch(e){en(`WebGLState:`,e)}}function je(){try{e.texSubImage2D(...arguments)}catch(e){en(`WebGLState:`,e)}}function Me(){try{e.texSubImage3D(...arguments)}catch(e){en(`WebGLState:`,e)}}function Ne(){try{e.compressedTexSubImage2D(...arguments)}catch(e){en(`WebGLState:`,e)}}function P(){try{e.compressedTexSubImage3D(...arguments)}catch(e){en(`WebGLState:`,e)}}function Pe(){try{e.texStorage2D(...arguments)}catch(e){en(`WebGLState:`,e)}}function Fe(){try{e.texStorage3D(...arguments)}catch(e){en(`WebGLState:`,e)}}function Ie(){try{e.texImage2D(...arguments)}catch(e){en(`WebGLState:`,e)}}function Le(){try{e.texImage3D(...arguments)}catch(e){en(`WebGLState:`,e)}}function F(t){return d[t]===void 0?e.getParameter(t):d[t]}function Re(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function I(t){se.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),se.copy(t))}function L(t){ce.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),ce.copy(t))}function R(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),e.uniformBlockBinding(n,i,i),r.set(t,i))}function ze(t,n,r){let i=l.get(n).get(t);c[i]!==r&&(e.bindBufferBase(e.UNIFORM_BUFFER,i,r),c[i]=r)}function Be(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},re=null,ie={},f={},c={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new N(0,0,0),T=0,E=!1,D=null,ee=null,O=null,k=null,A=null,se.set(0,0,e.canvas.width,e.canvas.height),ce.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:de,disable:fe,bindFramebuffer:pe,drawBuffers:me,useProgram:he,setBlending:ve,setMaterial:ye,setFlipSided:be,setCullFace:xe,setLineWidth:Se,setPolygonOffset:we,setScissorTest:Te,activeTexture:Ee,bindTexture:De,unbindTexture:Oe,compressedTexImage2D:ke,compressedTexImage3D:Ae,texImage2D:Ie,texImage3D:Le,pixelStorei:Re,getParameter:F,updateUBOMapping:R,uniformBlockBinding:ze,texStorage2D:Pe,texStorage3D:Fe,texSubImage2D:je,texSubImage3D:Me,compressedTexSubImage2D:Ne,compressedTexSubImage3D:P,scissor:I,viewport:L,reset:Be}}function sa(e,t,n,r,i,a,o){let l=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,d=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),f=new tt,p=new WeakMap,m=new Set,h,g=new WeakMap,_=new Set,v=new FinalizationRegistry(e=>_.delete(e)),y=!1;try{y=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function b(e,t){return y?new OffscreenCanvas(e,t):Ke(`canvas`)}function x(e,t,n){let r=1,i=Be(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);h===void 0&&(h=b(n,a));let o=t?b(n,a):h;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),me(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&me(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function S(e){return e.generateMipmaps}function C(t){e.generateMipmap(t)}function w(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function E(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];me(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||me(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?je:T.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function D(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,me(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function ee(e,t){return S(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function O(e){let t=new WeakRef(e);r.get(e).__ref=t,_.add(t),v.register(e,t,t)}function A(e){let t=r.get(e).__ref;t!==void 0&&(_.delete(t),v.unregister(t))}function j(e){te(e.target)}function M(e){ne(e.target)}function te(e){e.removeEventListener(`dispose`,j),A(e),oe(e),e.isVideoTexture&&p.delete(e),e.isHTMLTexture&&m.delete(e)}function ne(e){e.removeEventListener(`dispose`,M),A(e),ce(e)}function ae(){for(let e of _){let t=e.deref();t!==void 0&&(t.isRenderTarget===!0?ne(t):te(t))}_.clear(),m.clear()}function oe(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=g.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&se(e),Object.keys(i).length===0&&g.delete(n)}r.remove(e)}function se(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=g.get(i);delete a[n.__cacheKey],o.memory.textures--}function ce(t){let n=r.get(t);n.__depthDisposeCallback&&n.__depthDisposeCallback();let i=t.depthTexture;if(i&&i.renderTarget===t&&te(i),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let a=t.textures;for(let t=0,n=a.length;t<n;t++){let n=r.get(a[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),o.memory.textures--),r.remove(a[t])}r.remove(t)}let le=0;function ue(){le=0}function de(){return le}function fe(e){le=e}function pe(){let e=le;return e>=i.maxTextures&&me(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+i.maxTextures),le+=1,e}function he(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.mipmapsAutoUpdate),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function ge(t,i){let a=r.get(t);if(t.isVideoTexture&&R(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)me(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)me(`WebGLRenderer: Texture marked for update but image is incomplete`);else{Ae(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function _e(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?Ae(a,t,i):(t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i))}function ve(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?Ae(a,t,i):n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function ye(t,i){let a=r.get(t);t.version>0&&a.__version!==t.version?Me(a,t,i):n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let be={[re]:e.REPEAT,[s]:e.CLAMP_TO_EDGE,[k]:e.MIRRORED_REPEAT},Se={[ie]:e.NEAREST,[ln]:e.NEAREST_MIPMAP_NEAREST,[we]:e.NEAREST_MIPMAP_LINEAR,[nn]:e.LINEAR,[u]:e.LINEAR_MIPMAP_NEAREST,[De]:e.LINEAR_MIPMAP_LINEAR},Ce={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function Te(n,a){if(a.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(a.magFilter===1006||a.magFilter===1007||a.magFilter===1005||a.magFilter===1008||a.minFilter===1006||a.minFilter===1007||a.minFilter===1005||a.minFilter===1008)&&me(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,be[a.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,be[a.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,be[a.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,Se[a.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,Se[a.minFilter]),a.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,Ce[a.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(a.magFilter===1003||a.minFilter!==1005&&a.minFilter!==1008||a.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(a.anisotropy>1||r.get(a).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,i.getMaxAnisotropy())),r.get(a).__currentAnisotropy=a.anisotropy}}}function Ee(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,j),O(n));let i=n.source,a=g.get(i);a===void 0&&(a={},g.set(i,a));let s=he(n);if(s!==t.__cacheKey){a[s]===void 0&&(a[s]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,r=!0),a[s].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&se(n)),t.__cacheKey=s,t.__webglTexture=a[s].texture}return r}function Oe(e,t,n){return Math.floor(Math.floor(e/n)/t)}function ke(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=Oe(n.start,r.width,4),c=Oe(t.start,r.width,4);n.start<=i+1&&a===c&&Oe(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function Ae(t,o,s){let l=e.TEXTURE_2D;(o.isDataArrayTexture||o.isCompressedArrayTexture)&&(l=e.TEXTURE_2D_ARRAY),o.isData3DTexture&&(l=e.TEXTURE_3D);let u=Ee(t,o),d=o.source;n.bindTexture(l,t.__webglTexture,e.TEXTURE0+s);let f=r.get(d);if(d.version!==f.__version||u===!0){if(n.activeTexture(e.TEXTURE0+s),!(typeof ImageBitmap<`u`&&o.image instanceof ImageBitmap)){let t=T.getPrimaries(T.workingColorSpace),r=o.colorSpace===``?null:T.getPrimaries(o.colorSpace),i=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,i)}n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment);let t=x(o.image,!1,i.maxTextureSize);t=ze(o,t);let r=a.convert(o.format,o.colorSpace),p=a.convert(o.type),h=E(o.internalFormat,r,p,o.normalized,o.colorSpace,o.isVideoTexture);Te(l,o);let g,_=o.mipmaps,v=o.isVideoTexture!==!0,y=f.__version===void 0||u===!0,b=d.dataReady,w=ee(o,t);if(o.isDepthTexture)h=D(o.format===xe,o.type),y&&(v?n.texStorage2D(e.TEXTURE_2D,1,h,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,h,t.width,t.height,0,r,p,null));else if(o.isDataTexture){if(_.length>0){v&&y&&n.texStorage2D(e.TEXTURE_2D,w,h,_[0].width,_[0].height);for(let t=0,i=_.length;t<i;t++)g=_[t],v?b&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,g.width,g.height,r,p,g.data):n.texImage2D(e.TEXTURE_2D,t,h,g.width,g.height,0,r,p,g.data);o.generateMipmaps=!1}else v?(y&&n.texStorage2D(e.TEXTURE_2D,w,h,t.width,t.height),b&&ke(o,t,r,p)):n.texImage2D(e.TEXTURE_2D,0,h,t.width,t.height,0,r,p,t.data)}else if(o.isCompressedTexture){if(o.isCompressedArrayTexture){v&&y&&n.texStorage3D(e.TEXTURE_2D_ARRAY,w,h,_[0].width,_[0].height,t.depth);for(let i=0,a=_.length;i<a;i++)if(g=_[i],o.format!==1023){if(r!==null){if(v){if(b){if(o.layerUpdates.size>0){let t=c(g.width,g.height,o.format,o.type);for(let a of o.layerUpdates){let o=g.data.subarray(a*t/g.data.BYTES_PER_ELEMENT,(a+1)*t/g.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,a,g.width,g.height,1,r,o)}}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,g.width,g.height,t.depth,r,g.data)}}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,i,h,g.width,g.height,t.depth,0,g.data,0,0)}else me(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else v?b&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,g.width,g.height,t.depth,r,p,g.data):n.texImage3D(e.TEXTURE_2D_ARRAY,i,h,g.width,g.height,t.depth,0,r,p,g.data);o.layerUpdates.size>0&&o.clearLayerUpdates()}else{v&&y&&n.texStorage2D(e.TEXTURE_2D,w,h,_[0].width,_[0].height);for(let t=0,i=_.length;t<i;t++)g=_[t],o.format===1023?v?b&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,g.width,g.height,r,p,g.data):n.texImage2D(e.TEXTURE_2D,t,h,g.width,g.height,0,r,p,g.data):r===null?me(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):v?b&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,g.width,g.height,r,g.data):n.compressedTexImage2D(e.TEXTURE_2D,t,h,g.width,g.height,0,g.data)}}else if(o.isDataArrayTexture){if(v){if(y&&n.texStorage3D(e.TEXTURE_2D_ARRAY,w,h,t.width,t.height,t.depth),b){if(o.layerUpdates.size>0){let i=c(t.width,t.height,o.format,o.type);for(let a of o.layerUpdates){let o=t.data.subarray(a*i/t.data.BYTES_PER_ELEMENT,(a+1)*i/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,a,t.width,t.height,1,r,p,o)}o.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)}}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,h,t.width,t.height,t.depth,0,r,p,t.data)}else if(o.isData3DTexture)v?(y&&n.texStorage3D(e.TEXTURE_3D,w,h,t.width,t.height,t.depth),b&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)):n.texImage3D(e.TEXTURE_3D,0,h,t.width,t.height,t.depth,0,r,p,t.data);else if(o.isFramebufferTexture){if(y){if(v)n.texStorage2D(e.TEXTURE_2D,w,h,t.width,t.height);else{let i=t.width,a=t.height;for(let t=0;t<w;t++)n.texImage2D(e.TEXTURE_2D,t,h,i,a,0,r,p,null),i>>=1,a>>=1}}}else if(o.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),m.add(o),n.onpaint=e=>{let t=e.changedElements;for(let e of m)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(_.length>0){if(v&&y){let t=Be(_[0]);n.texStorage2D(e.TEXTURE_2D,w,h,t.width,t.height)}for(let t=0,i=_.length;t<i;t++)g=_[t],v?b&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,r,p,g):n.texImage2D(e.TEXTURE_2D,t,h,r,p,g);o.generateMipmaps=!1}else if(v){if(y){let r=Be(t);n.texStorage2D(e.TEXTURE_2D,w,h,r.width,r.height)}b&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,r,p,t)}else n.texImage2D(e.TEXTURE_2D,0,h,r,p,t);S(o)&&o.mipmapsAutoUpdate===!0&&C(l),f.__version=d.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function Me(t,o,s){if(o.image.length!==6)return;let c=Ee(t,o),l=o.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+s);let u=r.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+s);let t=T.getPrimaries(T.workingColorSpace),r=o.colorSpace===``?null:T.getPrimaries(o.colorSpace),d=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=o.isCompressedTexture||o.image[0].isCompressedTexture,p=o.image[0]&&o.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=x(o.image[e],!0,i.maxCubemapSize):m[e]=p?o.image[e].image:o.image[e],m[e]=ze(o,m[e]);let h=m[0],g=a.convert(o.format,o.colorSpace),_=a.convert(o.type),v=E(o.internalFormat,g,_,o.normalized,o.colorSpace),y=o.isVideoTexture!==!0,b=u.__version===void 0||c===!0,w=l.dataReady,O=ee(o,h);Te(e.TEXTURE_CUBE_MAP,o);let k;if(o.isDepthTexture){if(v=D(o.format===xe,o.type),b){if(y)n.texStorage2D(e.TEXTURE_CUBE_MAP,1,v,h.width,h.height);else for(let t=0;t<6;t++)n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,h.width,h.height,0,g,_,null)}}else if(f){y&&b&&n.texStorage2D(e.TEXTURE_CUBE_MAP,O,v,h.width,h.height);for(let t=0;t<6;t++){k=m[t].mipmaps;for(let r=0;r<k.length;r++){let i=k[r];o.format===1023?y?w&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,v,i.width,i.height,0,g,_,i.data):g===null?me(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):y?w&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,v,i.width,i.height,0,i.data)}}}else{if(k=o.mipmaps,y&&b){k.length>0&&O++;let t=Be(m[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,O,v,t.width,t.height)}for(let t=0;t<6;t++)if(p){y?w&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,m[t].width,m[t].height,g,_,m[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,m[t].width,m[t].height,0,g,_,m[t].data);for(let r=0;r<k.length;r++){let i=k[r].image[t].image;y?w&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,i.width,i.height,0,g,_,i.data)}}else{y?w&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,g,_,m[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,g,_,m[t]);for(let r=0;r<k.length;r++){let i=k[r];y?w&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,g,_,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,g,_,i.image[t])}}}S(o)&&o.mipmapsAutoUpdate===!0&&C(e.TEXTURE_CUBE_MAP),u.__version=l.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function Ne(t,i,o,s,c,u){let d=a.convert(o.format,o.colorSpace),f=a.convert(o.type),p=E(o.internalFormat,d,f,o.normalized,o.colorSpace),m=r.get(i),h=r.get(o);if(h.__renderTarget=i,!m.__hasExternalTextures){let t=Math.max(1,i.width>>u),r=Math.max(1,i.height>>u);c===e.TEXTURE_3D||c===e.TEXTURE_2D_ARRAY?n.texImage3D(c,u,p,t,r,i.depth,0,d,f,null):n.texImage2D(c,u,p,t,r,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),L(i)?l.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,s,c,h.__webglTexture,0,I(i)):(c===e.TEXTURE_2D||c>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&c<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,s,c,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function N(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=D(n.stencilBuffer,a),s=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;L(n)?l.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,I(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,I(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,s,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let o=t[i],s=a.convert(o.format,o.colorSpace),c=a.convert(o.type),u=E(o.internalFormat,s,c,o.normalized,o.colorSpace);L(n)?l.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,I(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,I(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function P(t,i,a){let o=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let s=r.get(i.depthTexture);s.__renderTarget=i;let c=o?i.depthTexture.image[0]:i.depthTexture.image;s.__webglTexture&&c.width===i.width&&c.height===i.height||(c.width=i.width,c.height=i.height,i.depthTexture.needsUpdate=!0),o?ye(i.depthTexture,0):ge(i.depthTexture,0);let u=s.__webglTexture,d=I(i),f=o?e.TEXTURE_CUBE_MAP_POSITIVE_X+a:e.TEXTURE_2D,p=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)L(i)?l.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(i.depthTexture.format===1027)L(i)?l.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function Pe(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer){if(a)for(let e=0;e<6;e++)P(i.__webglFramebuffer[e],t,e);else t.texture.mipmaps.length>0?P(i.__webglFramebuffer[0],t,0):P(i.__webglFramebuffer,t,0)}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),N(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else if(t.texture.mipmaps.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),N(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}n.bindFramebuffer(e.FRAMEBUFFER,null)}function Fe(t,n,i){let a=r.get(t);n!==void 0&&Ne(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&Pe(t)}function Ie(t){let i=t.texture,s=r.get(t),c=r.get(i);t.addEventListener(`dispose`,M),O(t);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=i.version,o.memory.textures++),u){s.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps.length>0){s.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)s.__webglFramebuffer[t][n]=e.createFramebuffer()}else s.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps.length>0){s.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)s.__webglFramebuffer[t]=e.createFramebuffer()}else s.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=r.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),o.memory.textures++)}if(t.samples>0&&L(t)===!1){s.__webglMultisampledFramebuffer=e.createFramebuffer(),s.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,s.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];s.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,s.__webglColorRenderbuffer[n]);let i=a.convert(r.format,r.colorSpace),o=a.convert(r.type),c=E(r.internalFormat,i,o,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),u=I(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,s.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(s.__webglDepthRenderbuffer=e.createRenderbuffer(),N(s.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),Te(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)Ne(s.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else Ne(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);S(i)?C(e.TEXTURE_CUBE_MAP):i.mipmaps.length>0&&e.texParameteri(e.TEXTURE_CUBE_MAP,e.TEXTURE_MAX_LEVEL,i.mipmaps.length-1),n.unbindTexture()}else if(d){for(let i=0,a=l.length;i<a;i++){let a=l[i],o=r.get(a),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,o.__webglTexture),Te(c,a),Ne(s.__webglFramebuffer,t,a,e.COLOR_ATTACHMENT0+i,c,0),S(a)&&C(c)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,c.__webglTexture),Te(r,i),i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)Ne(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else Ne(s.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);S(i)?C(r):i.mipmaps.length>0&&e.texParameteri(r,e.TEXTURE_MAX_LEVEL,i.mipmaps.length-1),n.unbindTexture()}t.depthBuffer&&Pe(t)}function Le(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(S(a)&&a.mipmapsAutoUpdate===!0){let t=w(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),C(t),n.unbindTexture()}}}let F=[];function Re(t){if(t.samples>0){if(L(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,c=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,l=r.get(t),u=i.length>1;if(u)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,l.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,l.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,l.__webglMultisampledFramebuffer),t.texture.mipmaps.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,l.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,l.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),u){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,l.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),d===!0&&(F.length=0,F.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&F.push(c),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,F))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),u)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,l.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,l.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,l.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,l.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&d){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function I(e){return Math.min(i.maxSamples,e.samples)}function L(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function R(e){let t=o.render.frame;p.get(e)!==t&&(p.set(e,t),e.update())}function ze(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(T.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&me(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):en(`WebGLTextures: Unsupported texture color space:`,n)),t}function Be(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(f.width=e.naturalWidth||e.width,f.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(f.width=e.displayWidth,f.height=e.displayHeight):(f.width=e.width,f.height=e.height),f}this.allocateTextureUnit=pe,this.resetTextureUnits=ue,this.getTextureUnits=de,this.setTextureUnits=fe,this.setTexture2D=ge,this.setTexture2DArray=_e,this.setTexture3D=ve,this.setTextureCube=ye,this.rebindTextures=Fe,this.setupRenderTarget=Ie,this.updateRenderTargetMipmap=Le,this.updateMultisampleRenderTarget=Re,this.setupDepthRenderbuffer=Pe,this.setupFrameBufferTexture=Ne,this.useMultisampledRTT=L,this.dispose=ae}function ca(e,t){function n(n,r=``){let i,a=T.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var la=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,ua=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,da=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new dt(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Pt({vertexShader:la,fragmentShader:ua,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new yt(new Ie(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},fa=class extends Lt{constructor(e,t){super();let n=this,i=null,a=1,o=null,s=`local-floor`,c=1,l=null,u=null,d=null,f=null,p=null,m=null,h=typeof XRWebGLBinding<`u`,g=new da,_={},v=t.getContextAttributes(),y=null,b=null,x=[],S=[],C=new tt,w=null,T=null,D=new E;D.viewport=new Ct;let ee=new E;ee.viewport=new Ct;let O=[D,ee],k=new se,A=null,j=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=x[e];return t===void 0&&(t=new Ve,x[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=x[e];return t===void 0&&(t=new Ve,x[e]=t),t.getGripSpace()},this.getHand=function(e){let t=x[e];return t===void 0&&(t=new Ve,x[e]=t),t.getHandSpace()};function M(e){let t=S.indexOf(e.inputSource);if(t===-1)return;let n=x[t];n!==void 0&&(n.update(e.inputSource,e.frame,l||o),n.dispatchEvent({type:e.type,data:e.inputSource}))}function te(){i.removeEventListener(`select`,M),i.removeEventListener(`selectstart`,M),i.removeEventListener(`selectend`,M),i.removeEventListener(`squeeze`,M),i.removeEventListener(`squeezestart`,M),i.removeEventListener(`squeezeend`,M),i.removeEventListener(`end`,te),i.removeEventListener(`inputsourceschange`,ne);for(let e=0;e<x.length;e++){let t=S[e];t!==null&&(S[e]=null,x[e].disconnect(t))}A=null,j=null,g.reset();for(let e in _)delete _[e];if(e.setRenderTarget(y),p=null,f=null,d=null,i=null,b=null,ce.stop(),n.isPresenting=!1,e.setPixelRatio(w),e.setSize(C.width,C.height,!1),T!==null){let e=T.camera;e.fov=T.fov,e.zoom=T.zoom,e.updateProjectionMatrix(),T=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){a=e,n.isPresenting===!0&&me(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){s=e,n.isPresenting===!0&&me(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(e){l=e},this.getBaseLayer=function(){return f===null?p:f},this.getBinding=function(){return d===null&&h&&(d=new XRWebGLBinding(i,t)),d},this.getFrame=function(){return m},this.getSession=function(){return i},this.setSession=async function(u){if(i=u,i!==null){if(y=e.getRenderTarget(),i.addEventListener(`select`,M),i.addEventListener(`selectstart`,M),i.addEventListener(`selectend`,M),i.addEventListener(`squeeze`,M),i.addEventListener(`squeezestart`,M),i.addEventListener(`squeezeend`,M),i.addEventListener(`end`,te),i.addEventListener(`inputsourceschange`,ne),v.xrCompatible!==!0&&await t.makeXRCompatible(),w=e.getPixelRatio(),e.getSize(C),h&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,o=null,s=null;v.depth&&(s=v.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=v.stencil?xe:Be,o=v.stencil?Ot:Je);let c={colorFormat:t.RGBA8,depthFormat:s,scaleFactor:a};d=this.getBinding(),f=d.createProjectionLayer(c),i.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),b=new it(f.textureWidth,f.textureHeight,{format:Qe,type:ut,depthTexture:new r(f.textureWidth,f.textureHeight,o,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:v.stencil,colorSpace:e.outputColorSpace,samples:v.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}else{let n={antialias:v.antialias,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:a};p=new XRWebGLLayer(i,t,n),i.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),b=new it(p.framebufferWidth,p.framebufferHeight,{format:Qe,type:ut,colorSpace:e.outputColorSpace,stencilBuffer:v.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1,storeMultisampledDepthBuffer:p.ignoreDepthValues===!1,storeMultisampledStencilBuffer:p.ignoreDepthValues===!1})}b.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await i.requestReferenceSpace(s),ce.setContext(i),ce.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function ne(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=S.indexOf(n);r>=0&&(S[r]=null,x[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=S.indexOf(n);if(r===-1){for(let e=0;e<x.length;e++)if(e>=S.length){S.push(n),r=e;break}else if(S[e]===null){S[e]=n,r=e;break}if(r===-1)break}let i=x[r];i&&i.connect(n)}}function re(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(i===null)return;let t=e.near,n=e.far;g.texture!==null&&(g.depthNear>0&&(t=g.depthNear),g.depthFar>0&&(n=g.depthFar)),k.near=ee.near=D.near=t,k.far=ee.far=D.far=n,(A!==k.near||j!==k.far)&&(i.updateRenderState({depthNear:k.near,depthFar:k.far}),A=k.near,j=k.far),k.layers.mask=e.layers.mask|6,D.layers.mask=k.layers.mask&-5,ee.layers.mask=k.layers.mask&-3;let r=e.parent,a=k.cameras;re(k,r);for(let e=0;e<a.length;e++)re(a[e],r);k.projectionMatrix.copy(D.projectionMatrix),k.projectionMatrixInverse.copy(D.projectionMatrixInverse),T===null&&e.isPerspectiveCamera&&(T={camera:e,fov:e.fov,zoom:e.zoom}),ie(e,k,r)};function ie(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=Re*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return k},this.getFoveation=function(){if(f!==null||p!==null)return c},this.setFoveation=function(e){c=e,f!==null&&(f.fixedFoveation=e),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=e)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(k)},this.getCameraTexture=function(e){return _[e]};let ae=null;function oe(t,r){if(u=r.getViewerPose(l||o),m=r,u!==null){let t=u.views;p!==null&&(e.setRenderTargetFramebuffer(b,p.framebuffer),e.setRenderTarget(b));let r=!1;t.length!==k.cameras.length&&(k.cameras.length=0,r=!0);for(let n=0;n<t.length;n++){let i=t[n],a=null;if(p!==null)a=p.getViewport(i);else{let t=d.getViewSubImage(f,i);a=t.viewport,n===0&&(e.setRenderTargetTextures(b,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(b))}let o=O[n];o===void 0&&(o=new E,o.layers.enable(n),o.viewport=new Ct,O[n]=o),o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(i.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(k.matrix.copy(o.matrix),k.matrix.decompose(k.position,k.quaternion,k.scale)),r===!0&&k.cameras.push(o)}let a=i.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&i.depthUsage==`gpu-optimized`&&h){d=n.getBinding();let e=d.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&g.init(e,i.renderState)}if(a&&a.includes(`camera-access`)&&h){e.state.unbindTexture(),d=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=_[n];e||(e=new dt,_[n]=e);let t=d.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<x.length;e++){let t=S[e],n=x[e];t!==null&&n!==void 0&&n.update(t,r,l||o)}ae&&ae(t,r),r.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:r}),m=null}let ce=new un;ce.setAnimationLoop(oe),this.setAnimationLoop=function(e){ae=e},this.dispose=function(){}}},pa=new ge,ma=new h;ma.set(-1,0,0,0,1,0,0,0,1);function ha(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Xt(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(pa.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(ma),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.diffuseRoughness>0&&(e.diffuseRoughness.value=t.diffuseRoughness,t.diffuseRoughnessMap&&(e.diffuseRoughnessMap.value=t.diffuseRoughnessMap,n(t.diffuseRoughnessMap,e.diffuseRoughnessMapTransform))),t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessMinimum,e.iridescenceThicknessMaximum.value=t.iridescenceThicknessMaximum,t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function ga(e,t,n,r){let i={},a={};function o(e,t){let n=t.program;r.uniformBlockBinding(e,n,i[e.id])}function s(e,n){let o=i[e.id];o===void 0&&(m(e),o=c(e),i[e.id]=o,e.addEventListener(`dispose`,g));let s=n.program;r.updateUBOMapping(e,s);let u=t.render.frame;a[e.id]!==u&&(l(e),a[e.id]=u)}function c(t){let n=e.createBuffer(),r=t.__size,i=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,n),e.bufferData(e.UNIFORM_BUFFER,r,i),e.bindBuffer(e.UNIFORM_BUFFER,null),n}function l(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)u(t[n],e,n,a);else u(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function u(t,n,r,i){if(f(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=h(i,!0);d(i,t.__data,e),e+=a.storage/Float32Array.BYTES_PER_ELEMENT}}else d(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function d(e,t,n){typeof e==`number`||typeof e==`boolean`?t[n]=e:e.isMatrix3?(t[n]=e.elements[0],t[n+1]=e.elements[1],t[n+2]=e.elements[2],t[n+3]=0,t[n+4]=e.elements[3],t[n+5]=e.elements[4],t[n+6]=e.elements[5],t[n+7]=0,t[n+8]=e.elements[6],t[n+9]=e.elements[7],t[n+10]=e.elements[8],t[n+11]=0):ArrayBuffer.isView(e)?t.set(e.subarray(0,t.length-n),n):e.toArray(t,n)}function f(e,t,n,r){let i=e.value,a=t+`_`+n;if(Array.isArray(i)){r[a]===void 0&&(r[a]=[]);let e=r[a],t=!1;for(let n=0;n<i.length;n++)p(i[n],e,n)===!0&&(t=!0);return t}return p(i,r,a)}function p(e,t,n){if(t[n]===void 0)return t[n]=typeof e==`number`||typeof e==`boolean`?e:ArrayBuffer.isView(e)?e.slice():e.clone(),!0;{let r=t[n];if(typeof e==`number`||typeof e==`boolean`){if(r!==e)return t[n]=e,!0}else if(ArrayBuffer.isView(e))return!0;else if(r.equals(e)===!1)return r.copy(e),!0}return!1}function m(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let i=0,a=r.length;i<a;i++){let a=r[i],o=Array.isArray(a.value)?a.value:[a.value],s=Array.isArray(t[e])||Array.isArray(a.value),c=n;for(let e=0,t=o.length;e<t;e++){let t=o[e],r=h(t,s),i=n%16,a=i%r.boundary,l=i+a;n+=a,l!==0&&16-l<r.storage&&(n+=16-l),e===0&&(c=n),n+=r.storage}a.__data=new(a.type===`int`?Int32Array:a.type===`uint`?Uint32Array:Float32Array)((n-c)/Float32Array.BYTES_PER_ELEMENT),a.__offset=c}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function h(e,t){let n={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(n.boundary=4,n.storage=4):e.isVector2?(n.boundary=8,n.storage=8):e.isVector3||e.isColor?(n.boundary=16,n.storage=12):e.isVector4?(n.boundary=16,n.storage=16):e.isMatrix3?(n.boundary=16,n.storage=48):e.isMatrix4?(n.boundary=16,n.storage=64):e.isTexture?me(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(n.boundary=16,n.storage=e.byteLength):me(`WebGLRenderer: Unsupported uniform value type.`,e),t===!0&&(n.boundary=16,n.storage=Math.ceil(n.storage/16)*16),n}function g(t){let n=t.target;n.removeEventListener(`dispose`,g),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function _(){for(let t in i)e.deleteBuffer(i[t]);i={},a={}}return{bind:o,update:s,dispose:_}}var _a=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),va=null;function ya(){return va===null&&(va=new F(_a,16,16,mt,nt),va.name=`DFG_LUT`,va.minFilter=nn,va.magFilter=nn,va.wrapS=s,va.wrapT=s,va.generateMipmaps=!1,va.needsUpdate=!0),va}var ba=class{constructor(e={}){let{canvas:t=on(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=ut}=e;this.isWebGLRenderer=!0;let m;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);m=n.getContextAttributes().alpha}else m=a;let h=f,g=new Set([Bt,oe,ee]),_=new Set([ut,Je,Ze,Ot,bt,Ht]),v=new Uint32Array(4),y=new Int32Array(4),b={textures:[],min:[],max:[],resolution:[]},x=null,S=null,C=[],w=[],E=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let D=this,O=!1,k=null,A=null,j=null,M=null;this._outputColorSpace=Pe;let te=0,ne=0,re=null,ie=-1,ae=null,se=new Ct,ce=new Ct,le=null,ue=new N(0),de=0,fe=t.width,pe=t.height,he=1,_e=null,ve=null,ye=new Ct(0,0,fe,pe),be=new Ct(0,0,fe,pe),xe=!1,Se=new Ye,Ce=new xt,we=!1,Te=!1,Ee=new ge,Oe=new jt,Ae=new Ct,je={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Me=!1;function Ne(){return re===null?he:1}let P=n;function Fe(e,n){return t.getContext(e,n)}let Ie,Le,F,Re,I,L,R,ze,Be,Ve,He,Ue,We,Ge,Ke,z,qe,B,Xe,V,H,Qe,$e;try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r187`),t.addEventListener(`webglcontextlost`,rt,!1),t.addEventListener(`webglcontextrestored`,at,!1),t.addEventListener(`webglcontextcreationerror`,ot,!1),P===null){let t=`webgl2`;if(P=Fe(t,e),P===null)throw Fe(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}et()}catch(e){throw t.removeEventListener(`webglcontextlost`,rt,!1),t.removeEventListener(`webglcontextrestored`,at,!1),t.removeEventListener(`webglcontextcreationerror`,ot,!1),en(`WebGLRenderer: `+e.message),e}function et(){Ie=new Bn(P),Ie.init(),H=new ca(P,Ie),Le=new bn(P,Ie,e,H),F=new oa(P,Ie),Le.reversedDepthBuffer&&d&&F.buffers.depth.setReversed(!0),A=P.createFramebuffer(),j=P.createFramebuffer(),M=P.createFramebuffer(),Re=new Un(P),I=new Bi,L=new sa(P,Ie,F,I,Le,H,Re),R=new zn(D),ze=new dn(P),Qe=new vn(P,ze),Be=new Vn(P,ze,Re,Qe),Ve=new Gn(P,Be,ze,Qe,Re),B=new Wn(P,Le,L),Ke=new xn(I),He=new zi(D,R,Ie,Le,Qe,Ke),Ue=new ha(D,I),We=new Wi,Ge=new Zi(Ie),qe=new _n(D,R,F,Ve,m,s),z=new aa(D,Ve,Le),$e=new ga(P,Re,Le,F),Xe=new yn(P,Ie,Re),V=new Hn(P,Ie,Re),Re.programs=He.programs,D.capabilities=Le,D.extensions=Ie,D.properties=I,D.renderLists=We,D.shadowMap=z,D.state=F,D.info=Re}h!==1009&&(E=new qn(h,t.width,t.height,o,r,i));let tt=new fa(D,P);this.xr=tt,this.getContext=function(){return P},this.getContextAttributes=function(){return P.getContextAttributes()},this.forceContextLoss=function(){let e=Ie.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=Ie.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return he},this.setPixelRatio=function(e){e!==void 0&&(he=e,this.setSize(fe,pe,!1))},this.getSize=function(e){return e.set(fe,pe)},this.setSize=function(e,n,r=!0){tt.isPresenting?me(`WebGLRenderer: Can't change size while VR device is presenting.`):(fe=e,pe=n,t.width=Math.floor(e*he),t.height=Math.floor(n*he),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),E!==null&&E.setSize(t.width,t.height),this.setViewport(0,0,e,n))},this.getDrawingBufferSize=function(e){return e.set(fe*he,pe*he).floor()},this.setDrawingBufferSize=function(e,n,r){fe=e,pe=n,he=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(h===1009)en(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);else{if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){me(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}E.setEffects(e||[])}},this.getCurrentViewport=function(e){return e.copy(se)},this.getViewport=function(e){return e.copy(ye)},this.setViewport=function(e,t,n,r){e.isVector4?ye.set(e.x,e.y,e.z,e.w):ye.set(e,t,n,r),F.viewport(se.copy(ye).multiplyScalar(Ne()).round())},this.getScissor=function(e){return e.copy(be)},this.setScissor=function(e,t,n,r){e.isVector4?be.set(e.x,e.y,e.z,e.w):be.set(e,t,n,r),F.scissor(ce.copy(be).multiplyScalar(Ne()).round())},this.getScissorTest=function(){return xe},this.setScissorTest=function(e){F.setScissorTest(xe=e)},this.setOpaqueSort=function(e){_e=e},this.setTransparentSort=function(e){ve=e},this.getClearColor=function(e){return e.copy(qe.getClearColor())},this.setClearColor=function(){qe.setClearColor(...arguments)},this.getClearAlpha=function(){return qe.getClearAlpha()},this.setClearAlpha=function(){qe.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(re!==null){let t=re.texture.format;e=g.has(t)}if(e){let e=re.texture.type,t=_.has(e),n=qe.getClearColor(),r=qe.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(v[0]=i,v[1]=a,v[2]=o,v[3]=r,P.clearBufferuiv(P.COLOR,0,v)):(y[0]=i,y[1]=a,y[2]=o,y[3]=r,P.clearBufferiv(P.COLOR,0,y))}else r|=P.COLOR_BUFFER_BIT}t&&(r|=P.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=P.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&P.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),k=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,rt,!1),t.removeEventListener(`webglcontextrestored`,at,!1),t.removeEventListener(`webglcontextcreationerror`,ot,!1),qe.dispose(),We.dispose(),Ge.dispose(),L.dispose(),I.dispose(),R.dispose(),Ve.dispose(),Be.dispose(),Qe.dispose(),$e.dispose(),He.dispose(),tt.dispose(),tt.removeEventListener(`sessionstart`,ht),tt.removeEventListener(`sessionend`,gt),_t.stop()};function rt(e){e.preventDefault(),ke(`WebGLRenderer: Context Lost.`),O=!0}function at(){ke(`WebGLRenderer: Context Restored.`),O=!1;let e=Re.autoReset,t=z.enabled,n=z.autoUpdate,r=z.needsUpdate,i=z.type;et(),Re.autoReset=e,z.enabled=t,z.autoUpdate=n,z.needsUpdate=r,z.type=i}function ot(e){en(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function ct(e){let t=e.target;t.removeEventListener(`dispose`,ct),lt(t)}function lt(e){dt(e),I.remove(e)}function dt(e){let t=I.get(e).programs;t!==void 0&&(t.forEach(function(e){He.releaseProgram(e)}),e.isShaderMaterial&&He.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=je);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=Nt(e,t,n,r,i);F.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Be.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;Qe.setup(i,r,s,n,c);let h,g=Xe;if(c!==null&&(h=ze.get(c),g=V,g.setIndex(h)),i.isMesh)r.wireframe===!0?(F.setLineWidth(r.wireframeLinewidth*Ne()),g.setMode(P.LINES)):g.setMode(P.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),F.setLineWidth(e*Ne()),i.isLineSegments?g.setMode(P.LINES):i.isLineLoop?g.setMode(P.LINE_LOOP):g.setMode(P.LINE_STRIP)}else i.isPoints?g.setMode(P.POINTS):i.isSprite&&g.setMode(P.TRIANGLES);if(i.isBatchedMesh){if(Ie.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?ze.get(c).bytesPerElement:1,o=I.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(P,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function ft(e,t,n,r){k!==null&&e.isNodeMaterial&&k.setObject(r,e),we===!0&&Ke.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,Dt(e,t,r),e.side=0,e.needsUpdate=!0,Dt(e,t,r),e.side=2):Dt(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),k!==null&&k.renderStart(e,t,n),S=Ge.get(n),S.init(t),w.push(S),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(S.pushLight(e),e.castShadow&&S.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(S.pushLight(e),e.castShadow&&S.pushShadow(e))}),S.setupLights(),k!==null&&k.updateLights(S.state.lightsArray),Te=this.localClippingEnabled,we=Ke.init(this.clippingPlanes,Te),we===!0&&Ke.setGlobalState(this.clippingPlanes,t),k!==null&&z.render(S.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i){if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];ft(o,n,t,e),r.add(o)}else ft(i,n,t,e),r.add(i)}}),S=w.pop(),k!==null&&k.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){r.forEach(function(e){let t=I.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0?t(e):setTimeout(n,10)}Ie.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let pt=null;function mt(e){pt&&pt(e)}function ht(){_t.stop()}function gt(){_t.start()}let _t=new un;_t.setAnimationLoop(mt),typeof self<`u`&&_t.setContext(self),this.setAnimationLoop=function(e){pt=e,tt.setAnimationLoop(e),e===null?_t.stop():_t.start()},tt.addEventListener(`sessionstart`,ht),tt.addEventListener(`sessionend`,gt),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){en(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(O===!0)return;k!==null&&k.renderStart(e,t);let n=tt.enabled===!0&&tt.isPresenting===!0,r=E!==null&&(re===null||n)&&E.begin(D,re);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),tt.enabled===!0&&tt.isPresenting===!0&&(E===null||E.isCompositing()===!1)&&(tt.cameraAutoUpdate===!0&&tt.updateCamera(t),t=tt.getCamera()),e.isScene===!0&&e.onBeforeRender(D,e,t,re),S=Ge.get(e,w.length),S.init(t),S.state.textureUnits=L.getTextureUnits(),w.push(S),Ee.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),t.isArrayCamera?Ce.setFromArrayCamera(t):Se.setFromProjectionMatrix(Ee,st,t.reversedDepth),Te=this.localClippingEnabled,we=Ke.init(this.clippingPlanes,Te),x=We.get(e,C.length),x.init(),C.push(x),this.info.render.frame++,tt.enabled===!0&&tt.isPresenting===!0){let e=D.xr.getDepthSensingMesh();e!==null&&vt(e,t,-1/0,D.sortObjects)}vt(e,t,0,D.sortObjects),x.finish(),k!==null&&k.updateLights(S.state.lightsArray),D.sortObjects===!0&&x.sort(_e,ve),Me=tt.enabled===!1||tt.isPresenting===!1||tt.hasDepthSensing()===!1,Me&&qe.addToRenderList(x,e),this.info.autoReset===!0&&this.info.reset(),we===!0&&Ke.beginShadows();let i=S.state.shadowsArray;if(z.render(i,e,t),we===!0&&Ke.endShadows(),(r&&E.hasRenderPass())===!1){let n=x.opaque,r=x.transmissive;if(S.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];St(n,r,e,a)}Me&&qe.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];yt(x,e,n,n.viewport)}}else r.length>0&&St(n,r,e,t),Me&&qe.render(e),yt(x,e,t)}re!==null&&ne===0&&(L.updateMultisampleRenderTarget(re),L.updateRenderTargetMipmap(re)),r&&E.end(D),e.isScene===!0&&e.onAfterRender(D,e,t),Qe.resetDefaultState(),ie=-1,ae=null,w.pop(),w.length>0?(S=w[w.length-1],L.setTextureUnits(S.state.textureUnits),we===!0&&Ke.setGlobalState(D.clippingPlanes,S.state.camera)):S=null,C.pop(),x=C.length>0?C[C.length-1]:null,k!==null&&k.renderEnd()};function vt(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLight)S.pushLight(e),e.castShadow&&S.pushShadow(e);else if(e.isSprite){let i=t.isArrayCamera?Ce:Se;if(!e.frustumCulled||e.intersectsFrustum(i)){r&&Ae.setFromMatrixPosition(e.matrixWorld).applyMatrix4(Ee);let i=Ve.update(e),a=e.material;a.visible&&x.push(e,i,a,n,Ae.z,null,t)}}else if(e.isMesh||e.isLine||e.isPoints){let i=t.isArrayCamera?Ce:Se;if(!e.frustumCulled||e.intersectsFrustum(i)){let i=Ve.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),Ae.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),Ae.copy(e.boundingSphere.center)),Ae.applyMatrix4(e.matrixWorld).applyMatrix4(Ee)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&x.push(e,i,c,n,Ae.z,s,t)}}else a.visible&&x.push(e,i,a,n,Ae.z,null,t)}}}let i=e.children;for(let e=0,a=i.length;e<a;e++)vt(i[e],t,n,r)}function yt(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;S.setupLightsView(n),we===!0&&Ke.setGlobalState(D.clippingPlanes,n),r&&F.viewport(se.copy(r)),i.length>0&&wt(i,t,n),a.length>0&&wt(a,t,n),o.length>0&&wt(o,t,n),F.buffers.depth.setTest(!0),F.buffers.depth.setMask(!0),F.buffers.color.setMask(!0),F.setPolygonOffset(!1)}function St(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(S.state.transmissionRenderTarget[r.id]===void 0){let e=Ie.has(`EXT_color_buffer_half_float`)||Ie.has(`EXT_color_buffer_float`);S.state.transmissionRenderTarget[r.id]=new it(1,1,{generateMipmaps:!0,type:e?nt:ut,minFilter:De,samples:Math.max(4,Le.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:T.workingColorSpace})}let a=S.state.transmissionRenderTarget[r.id],o=r.viewport||se;a.setSize(o.z*D.transmissionResolutionScale,o.w*D.transmissionResolutionScale);let s=D.getRenderTarget(),c=D.getActiveCubeFace(),l=D.getActiveMipmapLevel();D.setRenderTarget(a),D.getClearColor(ue),de=D.getClearAlpha(),de<1&&D.setClearColor(16777215,.5),D.clear(),Me&&qe.render(n);let u=D.toneMapping;D.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),S.setupLightsView(r),we===!0&&Ke.setGlobalState(D.clippingPlanes,r),wt(e,n,r),L.updateMultisampleRenderTarget(a),L.updateRenderTargetMipmap(a),Ie.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,Tt(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(L.updateMultisampleRenderTarget(a),L.updateRenderTargetMipmap(a))}D.setRenderTarget(s,c,l),D.setClearColor(ue,de),d!==void 0&&(r.viewport=d),D.toneMapping=u}function wt(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&Tt(o,t,n,s,l,c)}}function Tt(e,t,n,r,i,a){k!==null&&i.isNodeMaterial&&k.setObject(e,i),e.onBeforeRender(D,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(D,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,D.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,D.renderBufferDirect(n,t,r,i,e,a),i.side=2):D.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(D,t,n,r,i,a)}function Et(e){let t=0;for(let n of e)n.texture!==null&&t++;return t}function Dt(e,t,n){t.isScene!==!0&&(t=je);let r=I.get(e),i=S.state.lights,a=S.state.shadowsArray,o=i.state.version,s=He.getParameters(e,i.state,a,t,n,S.state.lightProbeGridArray),c=He.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=R.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,ct),l=new Map,r.programs=l,r.programVariants=new Map);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return Mt(e,s),d}else s.uniforms=He.getUniforms(e),k!==null&&e.isNodeMaterial&&k.build(e,n,s),e.onBeforeCompile(s,D),d=He.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Ke.uniform),Mt(e,s),r.needsLights=Ft(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.numLightProbeGrids=Et(S.state.lightProbeGridArray),r.currentProgram=d,r.uniformsList=null,d}function kt(e,t,n,r,i){let a=I.get(e),o=a.currentProgram.id+`,`+r+`,`+i,s=a.programVariants.get(o);return s===void 0?(s=Dt(e,t,n),a.programVariants.set(o,s)):(a.currentProgram=s,a.uniformsList=null,a.outputColorSpace=r,a.toneMapping=i),s}function At(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=ni.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function Mt(e,t){let n=I.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function Nt(e,t,n,r,i){t.isScene!==!0&&(t=je),L.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=re===null?D.outputColorSpace:re.isXRRenderTarget===!0?re.texture.colorSpace:T.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=R.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(re===null||re.isXRRenderTarget===!0)&&(h=D.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=I.get(r),y=S.state.lights;if(we===!0&&(Te===!0||e!==ae)){let t=e===ae&&r.id===ie;Ke.setState(r,e,t)}let x=!1,C=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version||i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?x=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Ke.numPlanes||v.numIntersection!==Ke.numIntersection)?x=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.morphTargetsCount===_&&v.numLightProbeGrids===Et(S.state.lightProbeGridArray)?(v.outputColorSpace!==s||v.toneMapping!==h)&&(C=!0):x=!0:x=!0:(x=!0,v.__version=r.version);let w=v.currentProgram;(x===!0||C===!0)&&(w=C===!0?kt(r,t,i,s,h):Dt(r,t,i),k&&r.isNodeMaterial&&k.onUpdateProgram(r,w,v));let E=!1,ee=!1,O=!1,A=w.getUniforms(),j=v.uniforms;if(F.useProgram(w.program)&&(E=!0,ee=!0,O=!0),r.id!==ie&&(ie=r.id,ee=!0),E||ae!==e){F.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),A.setValue(P,`projectionMatrix`,e.projectionMatrix),A.setValue(P,`viewMatrix`,e.matrixWorldInverse);let t=A.map.cameraPosition;t!==void 0&&t.setValue(P,Oe.setFromMatrixPosition(e.matrixWorld)),Le.logarithmicDepthBuffer&&A.setValue(P,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&A.setValue(P,`isOrthographic`,e.isOrthographicCamera===!0),ae!==e&&(ae=e,ee=!0,O=!0)}if(v.needsLights&&(y.state.sunShadowMap.length>0&&A.setValue(P,`sunShadowMap`,y.state.sunShadowMap,L),y.state.directionalShadowMap.length>0&&A.setValue(P,`directionalShadowMap`,y.state.directionalShadowMap,L),y.state.spotShadowMap.length>0&&A.setValue(P,`spotShadowMap`,y.state.spotShadowMap,L),y.state.pointShadowMap.length>0&&A.setValue(P,`pointShadowMap`,y.state.pointShadowMap,L)),i.isSkinnedMesh){A.setOptional(P,i,`bindMatrix`),A.setOptional(P,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),A.setValue(P,`boneTexture`,e.boneTexture,L))}i.isBatchedMesh&&(A.setOptional(P,i,`batchingTexture`),A.setValue(P,`batchingTexture`,i._matricesTexture,L),A.setOptional(P,i,`batchingIdTexture`),A.setValue(P,`batchingIdTexture`,i._indirectTexture,L),A.setOptional(P,i,`batchingColorTexture`),i._colorsTexture!==null&&A.setValue(P,`batchingColorTexture`,i._colorsTexture,L));let M=n.morphAttributes;if((M.position!==void 0||M.normal!==void 0||M.color!==void 0)&&B.update(i,n,w),(ee||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,A.setValue(P,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(j.envMapIntensity.value=t.environmentIntensity),j.dfgLUT!==void 0&&(j.dfgLUT.value=ya()),ee){if(A.setValue(P,`toneMappingExposure`,D.toneMappingExposure),v.needsLights&&Pt(j,O),a&&r.fog===!0&&Ue.refreshFogUniforms(j,a),Ue.refreshMaterialUniforms(j,r,he,pe,S.state.transmissionRenderTarget[e.id]),v.needsLights&&v.numLightProbeGrids>0){let e=b,t=0;for(let n of S.state.lightProbeGridArray)n.texture!==null&&(e.textures[t]=n.texture,e.min[t]=n.boundingBox.min,e.max[t]=n.boundingBox.max,e.resolution[t]=n.resolution,t++);for(let n in e)e[n].length=t;j.probesSH.value=e.textures,j.probesMin.value=e.min,j.probesMax.value=e.max,j.probesResolution.value=e.resolution}ni.upload(P,At(v),j,L)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(ni.upload(P,At(v),j,L),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&A.setValue(P,`center`,i.center),A.setValue(P,`modelViewMatrix`,i.modelViewMatrix),A.setValue(P,`normalMatrix`,i.normalMatrix),A.setValue(P,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];$e.update(n,w),$e.bind(n,w)}}return w}function Pt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function Ft(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return te},this.getActiveMipmapLevel=function(){return ne},this.getRenderTarget=function(){return re},this.setRenderTargetTextures=function(e,t,n){let r=I.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),I.get(e.texture).__webglTexture=t,I.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=I.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){re=e,te=t,ne=n;let r=null,i=!1,a=!1;if(e){let o=I.get(e);if(o.__useDefaultFramebuffer!==void 0){F.bindFramebuffer(P.FRAMEBUFFER,o.__webglFramebuffer),se.copy(e.viewport),ce.copy(e.scissor),le=e.scissorTest,F.viewport(se),F.scissor(ce),F.setScissorTest(le),ie=-1;return}if(o.__webglFramebuffer===void 0)L.setupRenderTarget(e);else if(o.__hasExternalTextures)L.rebindTextures(e,I.get(e.texture).__webglTexture,I.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&I.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);L.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=I.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&L.useMultisampledRTT(e)===!1?I.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,se.copy(e.viewport),ce.copy(e.scissor),le=e.scissorTest}else se.copy(ye).multiplyScalar(he).floor(),ce.copy(be).multiplyScalar(he).floor(),le=xe;if(n!==0&&(r=A),F.bindFramebuffer(P.FRAMEBUFFER,r)&&F.drawBuffers(e,r),F.viewport(se),F.scissor(ce),F.setScissorTest(le),i){let r=I.get(e.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=I.get(e.textures[t]);P.framebufferTextureLayer(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=I.get(e.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,t.__webglTexture,n)}ie=-1};function It(e){let t=I.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=Le.textureFormatReadable(e.format),t.__typeReadable=Le.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){en(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=I.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){F.bindFramebuffer(P.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;e.textures.length>1&&P.readBuffer(P.COLOR_ATTACHMENT0+s);let u=It(o);if(u.__formatReadable===!1){en(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(u.__typeReadable===!1){en(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&P.readPixels(t,n,r,i,H.convert(c),H.convert(l),a)}finally{let e=re===null?null:I.get(re).__webglFramebuffer;F.bindFramebuffer(P.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=I.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){F.bindFramebuffer(P.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&P.readBuffer(P.COLOR_ATTACHMENT0+s);let d=It(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=P.createBuffer();P.bindBuffer(P.PIXEL_PACK_BUFFER,f),P.bufferData(P.PIXEL_PACK_BUFFER,a.byteLength,P.STREAM_READ),P.readPixels(t,n,r,i,H.convert(l),H.convert(u),0),P.bindBuffer(P.PIXEL_PACK_BUFFER,null);let m=re===null?null:I.get(re).__webglFramebuffer;F.bindFramebuffer(P.FRAMEBUFFER,m);let h=P.fenceSync(P.SYNC_GPU_COMMANDS_COMPLETE,0);return P.flush(),await p(P,h,4),P.bindBuffer(P.PIXEL_PACK_BUFFER,f),P.getBufferSubData(P.PIXEL_PACK_BUFFER,0,a),P.bindBuffer(P.PIXEL_PACK_BUFFER,null),P.deleteBuffer(f),P.deleteSync(h),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;L.setTexture2D(e,0),P.copyTexSubImage2D(P.TEXTURE_2D,n,0,0,o,s,i,a),F.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=H.convert(t.format),_=H.convert(t.type),v;t.isData3DTexture?(L.setTexture3D(t,0),v=P.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(L.setTexture2DArray(t,0),v=P.TEXTURE_2D_ARRAY):(L.setTexture2D(t,0),v=P.TEXTURE_2D),F.activeTexture(P.TEXTURE0),F.pixelStorei(P.UNPACK_FLIP_Y_WEBGL,t.flipY),F.pixelStorei(P.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),F.pixelStorei(P.UNPACK_ALIGNMENT,t.unpackAlignment);let y=F.getParameter(P.UNPACK_ROW_LENGTH),b=F.getParameter(P.UNPACK_IMAGE_HEIGHT),x=F.getParameter(P.UNPACK_SKIP_PIXELS),S=F.getParameter(P.UNPACK_SKIP_ROWS),C=F.getParameter(P.UNPACK_SKIP_IMAGES);F.pixelStorei(P.UNPACK_ROW_LENGTH,h.width),F.pixelStorei(P.UNPACK_IMAGE_HEIGHT,h.height),F.pixelStorei(P.UNPACK_SKIP_PIXELS,l),F.pixelStorei(P.UNPACK_SKIP_ROWS,u),F.pixelStorei(P.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=I.get(e),r=I.get(t),h=I.get(n.__renderTarget),g=I.get(r.__renderTarget);F.bindFramebuffer(P.READ_FRAMEBUFFER,h.__webglFramebuffer),F.bindFramebuffer(P.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,I.get(e).__webglTexture,i,d+n),P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,I.get(t).__webglTexture,a,m+n)),P.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,P.DEPTH_BUFFER_BIT,P.NEAREST);F.bindFramebuffer(P.READ_FRAMEBUFFER,null),F.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||I.has(e)){let n=I.get(e),r=I.get(t);F.bindFramebuffer(P.READ_FRAMEBUFFER,j),F.bindFramebuffer(P.DRAW_FRAMEBUFFER,M);for(let e=0;e<c;e++)w?P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):P.framebufferTexture2D(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,n.__webglTexture,i),T?P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):P.framebufferTexture2D(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,r.__webglTexture,a),i===0?T?P.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):P.copyTexSubImage2D(v,a,f,p,l,u,o,s):P.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,P.COLOR_BUFFER_BIT,P.NEAREST);F.bindFramebuffer(P.READ_FRAMEBUFFER,null),F.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?P.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?P.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):P.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?P.texSubImage2D(P.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?P.compressedTexSubImage2D(P.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):P.texSubImage2D(P.TEXTURE_2D,a,f,p,o,s,g,_,h);F.pixelStorei(P.UNPACK_ROW_LENGTH,y),F.pixelStorei(P.UNPACK_IMAGE_HEIGHT,b),F.pixelStorei(P.UNPACK_SKIP_PIXELS,x),F.pixelStorei(P.UNPACK_SKIP_ROWS,S),F.pixelStorei(P.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps===!0&&t.mipmapsAutoUpdate===!0&&P.generateMipmap(v),F.unbindTexture()},this.initRenderTarget=function(e){I.get(e).__webglFramebuffer===void 0&&L.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?L.setTextureCube(e,0):e.isData3DTexture?L.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?L.setTexture2DArray(e,0):L.setTexture2D(e,0),F.unbindTexture()},this.resetState=function(){te=0,ne=0,re=null,F.reset(),Qe.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return st}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=T._getDrawingBufferColorSpace(e),t.unpackColorSpace=T._getUnpackColorSpace()}},xa={P:{id:`peaks`,name:`Peaks`,color:`#c5d4e2`,blurb:`High stone and snow.`},F:{id:`forest`,name:`Forest`,color:`#2f7a45`,blurb:`Old trees and thick shade.`},G:{id:`gate`,name:`Gate wilds`,color:`#6d4f86`,blurb:`The forest grows wrong this far north.`},M:{id:`meadow`,name:`Meadow`,color:`#d2b15a`,blurb:`Open grass and wildflowers.`},R:{id:`river`,name:`River`,color:`#3a8ec4`,blurb:`Silverrun and its banks.`},L:{id:`lake`,name:`Lake`,color:`#4aa4d8`,blurb:`Still water off Mirrormere.`},W:{id:`waste`,name:`Waste`,color:`#c48a52`,blurb:`Dry hills and ash.`},O:{id:`town`,name:`Town`,color:`#e6c36a`,blurb:`Lived in.`},A:{id:`farm`,name:`Farmland`,color:`#d2a04a`,blurb:`Fences, fields and barns.`},H:{id:`marsh`,name:`Marsh`,color:`#6f8a48`,blurb:`Reeds and slow water.`},C:{id:`coast`,name:`Coast`,color:`#e4d2a0`,blurb:`Sand, rock and the tide.`},S:{id:`sea`,name:`Sea`,color:`#1d4e86`,blurb:`Open water.`},I:{id:`arctic`,name:`Arctic`,color:`#d6ebf8`,blurb:`Snowfields, glass-blue ice and long white winds.`},V:{id:`volcanic`,name:`Volcanic wasteland`,color:`#5a2c28`,blurb:`Black stone, drifting ash and rivers of fire.`},D:{id:`ruins`,name:`Ruins`,color:`#8d6e9c`,blurb:`Something old broke here.`},Q:{id:`oasis`,name:`Desert oasis`,color:`#e6c56a`,blurb:`Dry dunes around a living pool.`}},Sa=[`PPPPPPPPPP`,`PFVVFFFPPP`,`PFVVGGFFWP`,`PRFVFMIIWP`,`RRMMMFIIWA`,`MRLMOMAHMM`,`CRMMRMAHDD`,`SCCQQRFFDS`,`SSCQQHFFSS`,`SSSCSCSSSS`],Ca={"3,4":[`harefield`,`Northwest of Oakhollow. Harefield is open meadow, knolls and wildflowers, meeting Brookside and Northleas.`],"4,4":[`northleas`,`North of Oakhollow. A pass through the peaks opens into Northleas, with pasture, knolls and a pond.`],"5,4":[`goldmead`,`Northeast of Oakhollow. Goldmead is a bright wood of oaks and pines around a sunny clearing.`],"3,5":[`brookside`,`West of Oakhollow. A ford crosses the river and a brook runs out through the mountains.`],"5,5":[`eastleas`,`East of Oakhollow. The road past the farm opens into meadows and wildflowers.`],"6,4":[`snowfall`,`East of Goldmead. Snowfall is a frozen meadow where the green wood fades into drifts, pine groves, frozen ponds and an igloo camp.`],"7,4":[`icewind`,`East of Snowfall. Icewind Reach is a wind-scoured barren of ice spires, frozen lakes and the bones of something enormous.`],"6,3":[`rimefang`,`North of Snowfall. The land climbs a long ramp to the flat summit of Rimefang Mesa, where the Ravenous Snow Yetis make their nests.`],"7,3":[`glimmerfrost`,`North of Icewind Reach. Glimmerfrost is a glacier of blue crystal, frozen lakes and glittering spires.`],"3,3":[`ashroad`,`North of Harefield. A pass through the northern peaks opens onto Ashen Road, where the green meadow gives way to scorched earth, dead trees and the first pools of lava.`],"3,2":[`warfield`,`North of Ashen Road. The Endless Field is the battleground of the Holy Knight and the Demon Knight, strewn with broken swords, shields, siege engines and the banners of both armies.`],"2,2":[`dawnspire`,`West of the Endless Field. Dawnspire is the Holy Knight's white marble castle, with gold-trimmed towers, a cathedral keep and a courtyard of blue fire.`],"3,1":[`hellspire`,`North of the Endless Field. Hellspire is the Demon Knight's black fortress, ringed in iron spikes, with lava in every crack and a gate shaped like a mouth.`],"2,1":[`cinderfall`,`West of Hellspire. Cinderfall is a smoking volcano of black basalt. Volcanum rests on the south shoulder of the cone, above the climb.`],"2,5":[`lagoon`,`West of Brookside. A pass through the western peaks opens onto Mirrormere Oasis, a turquoise lagoon ringed by palms, ferns and flowering jungle.`],"1,5":[`canopy`,`West of the oasis. Silverrun Canopy is thick jungle under giant trees, with an overgrown stone temple, carved idols and roaming Bengal Tigers.`],"2,6":[`sunken`,`South of the oasis, west of Longacre. Southmead is dense jungle with bamboo groves, pools and tall grass, where Battle Raptors hunt in packs.`],"1,6":[`tigerwood`,`Southwest of the oasis. Runmouth is a steaming jungle hollow with a wrecked pirate ship half swallowed by roots, haunted by Cursed Pirates.`],"2,7":[`pirateshore`,`South of Southmead. The jungle thins to a palm beach at Pirate Shore, where two pirate ships are moored and a long fishing pier runs out over deep water.`],"1,7":[`shellbeach`,`West of Pirate Shore. Shellbeach is a sweep of white sand, shells and driftwood between the jungle and the sea, with a pirate ship dock on the shore.`],"3,7":[`sunspill`,`South of Longacre, where the fields dry out. Sunspill is open dune, sandstone and scrub, with the west shore of the oasis pool in its southeast corner.`],"4,7":[`glassroad`,`South of Southford. The vale road comes down through the rim into Glassroad, a dry dune land whose southwest corner holds the oasis pool.`],"3,8":[`deepwell`,`South of Sunspill. Deepwell is desert dune and a south beach, with a mining pit three times the span of Greyrock cut into the sand.`],"4,8":[`greenbowl`,`South of Glassroad. The Oasis is the living heart of this desert bowl: palms, reeds and still water, drying to dune and then to the southern sea.`],"3,6":[`longacre`,`Southwest of Oakhollow, west of Southford. Mara's Acre and Wend Farm sit on the long fields, with a lane from the vale.`],"5,6":[`hayfield`,`Southeast of Oakhollow, east of Southford. Hay meadows and a lane from the vale.`],"5,7":[`silverrunWest`,`Reedford Reach. A wooded river bend with mossy banks, old-growth trees and a narrow trail beside the water.`],"6,7":[`silverrunNorth`,`The upper Silverrun forest. Ancient trees, thick fern beds and a river that bends west through the woodland.`],"7,7":[`silverrunEast`,`The Elderwood. A deep, lush forest with towering old-growth trees, mossy clearings and winding woodland paths.`],"6,8":[`silverrunRiver`,`Silverrun Crossing. The river pours in from the southern sea beneath a timber bridge, while a forest trail climbs toward the mountain ridge.`],"7,8":[`silverrunPeak`,`Greystone Summit. A great mountain rises on the western border, with a winding climb to a broad, flat summit above the forest canopy.`],"6,5":[`gilantreNw`,`Northwest quarter of Gilantre. Forest and prairie outside the brick wall, and the west drawbridge where the Eastleas road comes in.`],"7,5":[`gilantreNe`,`Northeast quarter of Gilantre. The Roman arena stands inside the wall, with prairie beyond the moat.`],"6,6":[`gilantreSw`,`Southwest quarter of Gilantre. Ironhaven Forge and the smiths sit inside the wall, with forest outside.`],"7,6":[`gilantreSe`,`Southeast quarter of Gilantre. The east drawbridge, the potion stall, and prairie outside the moat.`]},wa=[[`Frostwall`,`High Ice`,`Snowgate`,`White Pass`,`North Peak`,`Stormhorn`,`Glasscrag`,`Pale Spire`,`Frostspire`,`Last Snow`],[`Greymarch`,`Pinehollow`,`Cinderfall`,`Hellspire`,`Northwood`,`Hartwood`,`Ashgrove`,`Elmshade`,`Coldridge`,`Windcrag`],[`Fellwatch`,`Bramblewood`,`Dawnspire`,`The Endless Field`,`Gatewood`,`Wyrmwood`,`Darkbough`,`Emberwood`,`Cinderhill`,`Ashfall`],[`Riverwatch`,`Silverbend`,`Fernwood`,`Ashen Road`,`Goldglade`,`Meadowrise`,`Rimefang Mesa`,`Glimmerfrost`,`Dusthill`,`Redcrag`],[`Westwater`,`Millrace`,`Buttermead`,`Harefield`,`Northleas`,`Goldmead`,`Snowfall`,`Icewind Reach`,`Saltpan`,`Far Leas`],[`Westmead`,`Silverrun`,`Mirrormere`,`Brookside`,`Oakhollow`,`Eastleas`,`Gilantre`,`Gilantre`,`Reedbank`,`Frogmarsh`],[`Sandcliff`,`Runmouth`,`Southmead`,`Longacre`,`Southford`,`Hayfield`,`Gilantre`,`Gilantre`,`Broken Arch`,`Old Stones`],[`Seagate`,`Shellbeach`,`Pirate Shore`,`Sunspill`,`Glassroad`,`Reedford`,`Silverrun Reach`,`Elderwood`,`Sunken Yard`,`Grey Sea`],[`Open Water`,`West Deep`,`Pale Shore`,`Deepwell`,`Oasis`,`Sedge`,`Silverrun Crossing`,`Greystone Summit`,`South Deep`,`East Deep`],[`Far West`,`Whale Road`,`Glass Sea`,`South Strand`,`Midsea`,`East Strand`,`Kelp`,`Quiet Deep`,`Last Water`,`Far East`]];function Ta(){if(Sa.length!==10||wa.length!==10)throw Error(`World map must be 10 by 10`);let e=[];for(let t=0;t<10;t++){if(Sa[t].length!==10||wa[t].length!==10)throw Error(`World map row `+t+` is not 10 tiles`);for(let n=0;n<10;n++){let r=Sa[t][n],i=xa[r];if(!i)throw Error(`Unknown biome `+r);let a=t===6&&n===4,o=Ca[n+`,`+t],s=o&&String(o[0]).startsWith(`gilantre`),c=o&&o[0]===`silverrunWest`,l=r===`O`||a||!!o;e.push({id:`t${n}-${t}`,tx:n,tz:t,n:t*10+n+1,code:r,biome:s?`town`:c?`forest`:i.id,biomeName:s?`Town`:c?`Forest`:i.name,color:s?`#e6c36a`:c?xa.F.color:i.color,name:wa[t][n],blurb:r===`O`?`The starter tile. Oakhollow, the fairy forest, Greyrock Pit, Mirrormere and the farm all sit on this one tile. Passes leave north, west, east and south into the neighboring tiles.`:a?`South of Oakhollow. The south road drops through a pass beside the river and opens into Southford. A cave in the eastern bluff is the Darksycle Dragon's den. Lanes leave west into Longacre and east into Hayfield.`:o?o[1]:`${i.blurb} Mapped, not built yet.`,built:l,kind:r===`O`?`oakhollow`:a?`southford`:o?o[0]:`planned`,seed:400+t*17+n*13})}}return e}var Ea=Ta(),Da=Ea.find(e=>e.kind===`oakhollow`);function Oa(e,t){return e<0||t<0||e>=10||t>=10?null:Ea[t*10+e]}function ka(e){return{x:(e.tx-Da.tx)*144,z:(e.tz-Da.tz)*144}}var Aa=(e,t,n)=>e+(t-e)*n,ja=e=>Math.max(0,Math.min(1,e)),Ma=(e,t,n)=>{let r=ja((n-e)/(t-e||1));return r*r*(3-2*r)};function Na(e,t,n){let r=e.tx+t,i=e.tz+n,a=tn(r*1.85,i*1.85,11,3),o=tn(r*4.2+2.1,i*4.2,20,2);Math.min(t,n,1-t,1-n);let s=1.4,c=.42,l=.62,u=.28;switch(e.biome){case`peaks`:{s=3.5+a*7;let e=s>8.2?ja((s-8.2)/2.2):0;c=Aa(.24+a*.04,.7,e),l=Aa(.26+a*.03,.74,e),u=Aa(.32,.8,e);break}case`forest`:case`gate`:s=2.2+a*2.4,c=e.biome===`gate`?.14:.1,l=.28+a*.18,u=e.biome===`gate`?.16:.12,o>.78&&(l*=.86,c*=.9);break;case`meadow`:s=1.3+a*.8,c=.62+o*.1,l=.68,u=.28,o>.84&&(c=.82,l=.5,u=.52);break;case`river`:s=Math.abs(t-(.35+(a-.5)*.16))<.06?-.3:1.2+a*.5,s<.3?(c=.2,l=.55,u=.78):(c=.45,l=.62,u=.32);break;case`lake`:s=Math.hypot((t-.48)/.34,(n-.5)/.28)<1?-.2:1.1+a*.4,s<.3?(c=.18,l=.52,u=.78):(c=.55,l=.66,u=.34);break;case`waste`:s=2+a*4,c=.62+o*.12,l=.42,u=.24;break;case`farm`:s=1.2+a*.3,c=.58+o*.08,l=.52+a*.06,u=.24;break;case`marsh`:{let e=o>.62;s=e?-.1:.7+a*.3,c=e?.16:.32,l=e?.4:.48,u=e?.42:.24;break}case`coast`:{let e=Ma(.36,.62,n+(a-.5)*.14);s=Aa(1+a*.45,.14,e),c=Aa(.78,.13,e),l=Aa(.7,.42,e),u=Aa(.45,.58,e);break}case`sea`:s=.12,c=.11+a*.018,l=.31+a*.025,u=.54+a*.03;break;case`volcanic`:{s=2.4+a*3.4;let e=o>.84;c=e?.95:.2+o*.1,l=e?.42:.19+o*.05,u=e?.1:.2+o*.05;break}case`ruins`:s=1.2+a*.5,c=.28+o*.06,l=.42+a*.1,u=.24+o*.03;break;case`arctic`:{s=1.6+a*1.8;let e=a*.55+o*.45>.62;c=e?.52+a*.05:.64+a*.06,l=e?.68+a*.04:.76+a*.04,u=e?.8:.84;break}case`oasis`:s=Math.hypot((r-3.55)/.92,(i-7.48)/.78)<1?-.15:1.1+a*.55,s<.3?(c=.18,l=.58,u=.72):(c=.86+a*.05,l=.72+a*.06,u=.42);break;case`town`:s=1.3+a*.4,c=.38+o*.08,l=.56+a*.08,u=.26}let d=.86+ja(s/18)*.14;return{h:Math.max(.05,s),r:c*d,g:l*d,b:u*d}}function Pa(e,t,n){return!t||n<=0?e:n>=1?t:{h:Aa(e.h,t.h,n),r:Aa(e.r,t.r,n),g:Aa(e.g,t.g,n),b:Aa(e.b,t.b,n)}}function Fa(e,t,n){let r=24/144,i=e.tx+t,a=e.tz+n,o=(tn(i*3.4,a*3.4,5,3)-.5)*.1111111111111111,s=Na(e,t,n),c=t+o,l=n+o*.9,u=Oa(e.tx-1,e.tz),d=Oa(e.tx+1,e.tz),f=Oa(e.tx,e.tz-1),p=Oa(e.tx,e.tz+1);return u&&c<r&&(s=Pa(s,Na(u,t+1,n),Ma(r,0,c))),d&&c>.8333333333333334&&(s=Pa(s,Na(d,t-1,n),Ma(r,0,1-c))),f&&l<r&&(s=Pa(s,Na(f,t,n+1),Ma(r,0,l))),p&&l>.8333333333333334&&(s=Pa(s,Na(p,t,n-1),Ma(r,0,1-l))),s}function Ia(e,t){let n=e.width,r=e.getContext(`2d`),i=r.createImageData(n,n),a=i.data;for(let e=0;e<n;e++)for(let r=0;r<n;r++){let i=Fa(t,(r+.5)/n,(e+.5)/n),o=(e*n+r)*4;a[o]=Math.max(0,Math.min(255,i.r*255)),a[o+1]=Math.max(0,Math.min(255,i.g*255)),a[o+2]=Math.max(0,Math.min(255,i.b*255)),a[o+3]=255}r.putImageData(i,0,0)}var La={x:72,z:72},Ra={x:72,z:76},za={x:72,z:67},Ba={x:72,z:33},Va=.35,Ha=.28,Ua={x0:90,z0:84,x1:108,z1:99},Wa={x:98,z:66,pitR:5.5,rimR:10.5,blend:5.5,rimH:3,floorH:1,rampX0:88,rampHW:1.5},Ga={x:54,z:101,rx:8.5,rz:6.2},Ka={x0:54.9,x1:66,z:101,hw:1.2,y:1},qa={south:[[72,82],[72,90],[75,100],[70,112],[72,125],[72,140]],gate:[[80,72],[85,66],[85,57],[80,49],[75,42],[72,37]],east:[[80,78],[92,82],[99,88],[112,94],[128,92]],west:[[64,78],[54,80],[46,84]],forestWest:[[64,72],[55,66],[48,60]],mine:[[85,66],[88.5,66]],lake:[[74.5,97],[70,99.5],[66.5,101]]},Ja=[[34,41],[27,52],[34,63],[29,76],[38,90],[32,104],[42,118],[38,144]],Ya={x:34,z:42,r:7.5},Xa={FIELD:0,FOREST:1,MOUNTAIN:2,TOWN:3,WATER:4,FARM:5,GATE:6,MINE:7,LAKE:8,SOUTH:9};function Za(e,t,n,r,i,a){let o=i-n,s=a-r,c=z(((e-n)*o+(t-r)*s)/(o*o+s*s),0,1),l=e-(n+o*c),u=t-(r+s*c);return Math.hypot(l,u)}function Qa(e,t,n){let r=1e9;for(let i=0;i<n.length-1;i++)r=Math.min(r,Za(e,t,n[i][0],n[i][1],n[i+1][0],n[i+1][1]));return r}function $a(e,t=6){let n=[];for(let r=0;r<e.length-1;r++){let i=e[Math.max(0,r-1)],a=e[r],o=e[r+1],s=e[Math.min(e.length-1,r+2)];for(let e=0;e<t;e++){let r=e/t,c=r*r,l=c*r,u=(e,t,n,i)=>.5*(2*t+(-e+n)*r+(2*e-5*t+4*n-i)*c+(-e+3*t-3*n+i)*l);n.push([u(i[0],a[0],o[0],s[0]),u(i[1],a[1],o[1],s[1])])}}return n.push(e[e.length-1]),n}var eo=Object.fromEntries(Object.entries(qa).map(([e,t])=>[e,$a(t)])),to=$a(Ja,8);function no(e=Da){return e?.kind===`oakhollow`?ro():null}function ro(){let e=new Float32Array(20736),t=new Uint8Array(20736),n=new Uint8Array(20736),r=new Float32Array(62208),i=new Float32Array(20736),a=new Float32Array(20736),o=new Float32Array(20736),s=new Uint8Array(20736),c=new Uint8Array(20736);for(let n=0;n<144;n++)for(let r=0;r<144;r++){let i=n*144+r,a=tn(r*.045+10,n*.045+3,1,4),o=tn(r*.12,n*.12,2,3),l=(tn(r*.05+80,n*.05+20,7,3)-.5)*14,u=1+(a-.5)*2.4+(o-.5)*.7,d=he(66,54,n+(o-.5)*12),f=3+(a-.4)*9+(o-.5)*2;u=Ae(u,f,d);let p=r-La.x,m=n-La.z,h=Math.hypot(p,m)+l,g=he(46,64,h),_=g*(13+24*(1-Math.abs(2*tn(r*.05+50,n*.05+9,9,4)-1))+6*(o-.5));u+=_;let v=(r-Ra.x)*.85,y=n-Ra.z,b=Math.hypot(v,y)+(o-.5)*3,x=1-he(12,18,b);u=Ae(u,3,x);let S=Math.hypot(r-Ba.x,n-Ba.z),C=1-he(6,11,S);u=Ae(u,3,C),u=Math.max(u,.75);let w=Qa(r+.5,n+.5,to),T=Math.hypot(r+.5-Ya.x,n+.5-Ya.z),E=(Math.hypot((r+.5-Ga.x)/Ga.rx,(n+.5-Ga.z)/Ga.rz)-1)*((Ga.rx+Ga.rz)/2),D=Math.min(w-2,T-Ya.r,E),ee=1-he(-.5,3.2,D);u=Ae(u,-.5-(E<0?z(-E/4,0,1):0),ee);let O=r+.5-Wa.x,k=n+.5-Wa.z,A=Math.hypot(O,k);if(u=Ae(u,Wa.rimH,1-he(Wa.rimR,Wa.rimR+Wa.blend,A)),r>=Ua.x0-2&&r<=Ua.x1+2&&n>=Ua.z0-2&&n<=Ua.z1+2){let e=Math.max(Ua.x0-r,r-Ua.x1,Ua.z0-n,n-Ua.z1,0);u=Ae(u,1,1-he(0,3,e))}u=g>.12?Math.round(u):Math.round(u*2)/2,b<12.5&&(u=3),S<5.5&&(u=3);let j=Wa.pitR+(o-.5)*1.6,M=O>=Wa.rampX0-Wa.x&&O<-Wa.pitR&&Math.abs(k)<=Wa.rampHW?Math.floor(O-(Wa.rampX0-Wa.x)):-1;A<j&&(u=Wa.floorH),M>=0&&(u=Math.max(Wa.floorH,Wa.rimH-.5*(M+1))),e[i]=u,s[i]=+(M>=0||A<j&&O<-2&&Math.abs(k)<=Wa.rampHW),c[i]=A<j?1:A<j+2.2?2:A<Wa.rimR?3:0;let te=Xa.FIELD;g>.12?te=Xa.MOUNTAIN:d>.5&&(te=Xa.FOREST),b<15&&(te=Xa.TOWN),S<8&&(te=Xa.GATE),r>=Ua.x0&&r<=Ua.x1&&n>=Ua.z0&&n<=Ua.z1&&(te=Xa.FARM),c[i]&&(te=Xa.MINE),u<=.5&&D<1.4&&(te=E<1.4&&w-2>1.4&&T-Ya.r>1.4?Xa.LAKE:Xa.WATER),t[i]=te}let l=(t,n)=>e[z(n,0,143)*144+z(t,0,143)];for(let u=0;u<144;u++)for(let d=0;d<144;d++){let f=u*144+d,p=e[f];a[f]=Math.max(Math.abs(l(d+1,u)-p),Math.abs(l(d-1,u)-p),Math.abs(l(d,u+1)-p),Math.abs(l(d,u-1)-p));let m=d+.5,h=u+.5,g=0;for(let e of Object.keys(eo)){let t=Qa(m,h,eo[e]),n=e===`south`||e===`gate`?1.9:1.4;g=Math.max(g,1-he(n-.4,n+.4,t+(Ee(d,u,5)-.5)*.6))}Math.hypot((d-Ra.x)*.85,u-Ra.z);let _=Math.hypot(d+.5-Ra.x,u+.5-Ra.z)<5.5+(Ee(d,u,9)-.5)*1.2,v=Math.hypot(d+.5-Ba.x,u+.5-Ba.z);i[f]=g>.5||_||v<4.6?1:0,t[f]===Xa.WATER&&(i[f]=0),t[f]===Xa.FARM&&(i[f]=0);let y=Ee(d,u,77),b=tn(d*.09+3,u*.09+1,33,3),x=B.GRASS,S=1,C=1,w=1,T=t[f],E=[.92,1.06,.78],D=[.62,.92,.82],ee=(e,t,n)=>[Ae(e[0],t[0],n),Ae(e[1],t[1],n),Ae(e[2],t[2],n)];tn(d*.045+10,u*.045+3,1,4);let O=he(64,54,u+(tn(d*.12,u*.12,2,3)-.5)*12);o[f]=O;let k=ee(E,D,O),A=tn(d*.02+4,u*.02,17,3),j=tn(d*.033,u*.03,21,3),M=.86+b*.22+(A-.5)*.16;if(k=[k[0]*M*(.92+j*.18),k[1]*M*(.96+(1-j)*.06),k[2]*M*(.88+(1-j)*.2)],T===Xa.MOUNTAIN||p>8){let e=he(8,24,p);x=p>=22?B.SNOW:a[f]>=2||e>.55?Ee(d,u,4)>.8?B.MOSS_STONE:B.STONE:B.GRASS;let t=ee(k,[.78,.92,.78],e*.8);[S,C,w]=t,(x===B.STONE||x===B.MOSS_STONE)&&([S,C,w]=[.95,.97,1]),x===B.SNOW&&([S,C,w]=[.9+b*.08,.92+b*.06,.97])}else if(T===Xa.WATER||T===Xa.LAKE||p<=.5&&!c[f])x=p<=0?B.GRAVEL:B.SAND,[S,C,w]=[1,1,1],p<=.5&&p>0&&(x=B.SAND);else if(T===Xa.FARM)x=B.FARMLAND,[S,C,w]=[1,1,1];else if(i[f]){let e=T===Xa.TOWN||T===Xa.GATE,t=tn(d*.08+2,u*.08,44,2);e?(x=t<.22?B.GRAVEL:t>.86&&y>.7?B.DIRT:B.COBBLE,[S,C,w]=[1.08+t*.04,.92+y*.05,.64+t*.06]):(x=t<.28?B.DIRT:B.PATH,[S,C,w]=[.96,.9+t*.08,.78])}else if(g>.12){let e=z((g-.12)/.4,0,1);x=y>.55?B.DIRT:B.PATH,[S,C,w]=ee(k,[.86,.74,.52],.35+e*.45)}else x=y>.935&&O<.6?B.FLOWER_GRASS:B.GRASS,[S,C,w]=k,T===Xa.GATE&&([S,C,w]=[S*.8,C*.85,w*1]);if(c[f]){let e=Ee(d,u,61);s[f]?(x=B.COBBLE,[S,C,w]=[1.02,.9,.7],i[f]=1):c[f]===1?(x=e>.82?B.DIRT:B.GRAVEL,[S,C,w]=[.88,.84,.82]):c[f]===2?(x=e>.8?B.MOSS_STONE:B.STONE,[S,C,w]=[.95,.95,.98]):Ee(d>>1,u>>1,62)>.55&&!i[f]&&(x=e>.7?B.GRAVEL:B.STONE,[S,C,w]=[.95,.95,.98])}let te=.94+y*.12;n[f]=x,r[f*3]=S*te,r[f*3+1]=C*te,r[f*3+2]=w*te}return{H:e,zone:t,top:n,tint:r,pathMask:i,slope:a,forest:o}}var io={[B.GRASS]:[B.GRASS_SIDE,B.GRASS_SIDE],[B.FLOWER_GRASS]:[B.GRASS_SIDE,B.GRASS_SIDE],[B.COBBLE]:[B.BRICK,B.BRICK],[B.PATH]:[B.GRASS_SIDE,B.GRASS_SIDE],[B.STONE]:[B.STONE,B.STONE],[B.MOSS_STONE]:[B.STONE,B.STONE],[B.SNOW]:[B.SNOW_SIDE,B.SNOW_SIDE],[B.ICE]:[B.ICE,B.ICE],[B.FROST_GRASS]:[B.SNOW_SIDE,B.SNOW_SIDE],[B.BASALT]:[B.BASALT,B.BASALT],[B.ASH]:[B.ASH,B.BASALT],[B.LAVA]:[B.LAVA,B.CINDER],[B.CINDER]:[B.CINDER,B.BASALT],[B.OBSIDIAN]:[B.OBSIDIAN,B.OBSIDIAN],[B.FLAGSTONE]:[B.FLAGSTONE,B.FLAGSTONE],[B.SAND]:[B.SAND,B.SAND],[B.GRAVEL]:[B.GRAVEL,B.GRAVEL],[B.DIRT]:[B.DIRT,B.DIRT],[B.FARMLAND]:[B.DIRT,B.DIRT]},ao={SNOW:0,SAND:1,ASH:2,GRASS:3};function oo(e,t,n,r,i,a){if(e!==B.PATH&&e!==B.FROST_GRASS)return io[e]||[B.STONE,B.STONE];let o=0,s=0,c=0,l=0;for(let[e,u]of[[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]){let d=i+e,f=a+u;if(d<0||f<0||d>=n||f>=r)continue;let p=t[f*n+d];p!==B.PATH&&p!==B.COBBLE&&p!==B.GRAVEL&&(p===B.SNOW||p===B.ICE||p===B.FROST_GRASS?o++:p===B.SAND?s++:p===B.ASH||p===B.BASALT||p===B.CINDER||p===B.LAVA||p===B.OBSIDIAN?c++:l++)}let u=o>=s&&o>=c&&o>=l?ao.SNOW:s>=c&&s>=l?ao.SAND:c>=l?ao.ASH:ao.GRASS;return u===ao.SNOW?[B.SNOW_SIDE,B.SNOW_SIDE]:u===ao.SAND?[B.SAND,B.SAND]:u===ao.ASH?[B.ASH,B.BASALT]:e===B.FROST_GRASS?[B.SNOW_SIDE,B.SNOW_SIDE]:[B.GRASS_SIDE,B.GRASS_SIDE]}var so=24;function co(e,t,n={}){let r=n.width||144,i=n.depth||144,a=n.ox||0,o=n.oz||0,{H:s,top:c,tint:l,zone:u}=e,d=new V,f=!!n.smooth||!!e.smooth,p=(e,t)=>e>=0&&t>=0&&e<r&&t<i?s[t*r+e]:n.outside?.(e,t)??-3,m=(e,t)=>{let n=0,a=0;for(let r of[-1,0])for(let i of[-1,0]){let o=p(e+r,t+i);o==null||o<-2.5||(n+=o,a+=1)}return a?n/a:p(Math.max(0,Math.min(r-1,e)),Math.max(0,Math.min(i-1,t)))},h=(e,t)=>{if(e<0||t<0||e>=r||t>=i)return!0;let n=t*r+e,a=u[n];return a===Xa.WATER||a===Xa.MINE||a===Xa.LAKE||s[n]<.37},g=[],_={},v=e=>_[e]??(_[e]=ct(e));for(let e=0;e<i;e+=so)for(let n=0;n<r;n+=so){let _=[],y=[],b=[],x=[],S=[],C=(e,t,n,r)=>{let i=_.length/3;for(let i=0;i<4;i++)_.push(e[i][0],e[i][1],e[i][2]),y.push(t[0],t[1],t[2]),b.push(n[i][0],n[i][1]),x.push(r[i][0],r[i][1],r[i][2]);S.push(i,i+1,i+2,i,i+2,i+3)};for(let t=e;t<Math.min(i,e+so);t++)for(let e=n;e<Math.min(r,n+so);e++){let n=t*r+e,d=s[n],g=u[n],_=c[n],y=l[n*3],b=l[n*3+1],x=l[n*3+2],{u0:S,u1:w,vTop:T,vBot:E}=v(_),D=_===B.GRASS||_===B.FLOWER_GRASS,ee=(n,r)=>{let i=D?1.4:f?.85:.55,a=+(p(e+n,t)>d+i),o=+(p(e,t+r)>d+i),s=+(p(e+n,t+r)>d+i);return[.62,.78,.9,1][a&&o?0:3-(a+o+s)]},O=D?[1,1,1,1]:[[-1,-1],[-1,1],[1,1],[1,-1]].map(([e,t])=>ee(e,t)),k=D?0:Math.floor(Ee(e,t,13)*4),A=[[S,E],[S,T],[w,T],[w,E]],j=[0,1,2,3].map(e=>A[(e+k)%4]),M=f&&!h(e,t),te=M?m(e,t):d,ne=M?m(e,t+1):d,re=M?m(e+1,t+1):d,ie=M?m(e+1,t):d,ae=e=>e>=0&&e!==B.LAVA,oe=(e,t)=>e<0||t<0||e>=r||t>=i?-1:c[t*r+e],se=(e,t)=>e>=0&&t>=0&&e<r&&t<i,ce=(n,r)=>{let i=d;if(!ae(_))return i;for(let[a,o]of[[n-1,r-1],[n-1,r],[n,r-1],[n,r]]){if(a===e&&o===t||!se(a,o))continue;let n=p(a,o),r=d-n;r<=0||r>1.001||n<.37||ae(oe(a,o))&&(i=Math.min(i,n))}return i};M||(te=ce(e,t),ne=ce(e,t+1),re=ce(e+1,t+1),ie=ce(e+1,t));let le=e===0||t===0||e===r-1||t===i-1,ue=D?le?.04:.015:0,de=[[e+a-ue,te,t+o-ue],[e+a-ue,ne,t+o+1+ue],[e+a+1+ue,re,t+o+1+ue],[e+a+1+ue,ie,t+o-ue]],fe=de[1][0]-de[0][0],pe=de[1][1]-de[0][1],me=de[1][2]-de[0][2],he=de[3][0]-de[0][0],ge=de[3][1]-de[0][1],_e=de[3][2]-de[0][2],ve=pe*_e-me*ge,ye=me*he-fe*_e,be=fe*ge-pe*he,xe=Math.hypot(ve,ye,be)||1,Se=[ve/xe,ye/xe,be/xe],Ce=O.map(e=>[y*e,b*e,x*e]),we=g===Xa.WATER||g===Xa.LAKE;if(we||(D&&Se[1]<.55&&(Se[0]=0,Se[1]=1,Se[2]=0),!D&&O[0]+O[2]>O[1]+O[3]||D?C(de,Se,j,Ce):C([de[1],de[2],de[3],de[0]],Se,[j[1],j[2],j[3],j[0]],[Ce[1],Ce[2],Ce[3],Ce[0]])),we)continue;let Te=oo(_,c,r,i,e,t),De=[[1,0],[-1,0],[0,1],[0,-1]],Oe=[[ie,re],[te,ne],[ne,re],[te,ie]];for(let n=0;n<De.length;n++){let[r,i]=De[n],s=e+r,c=t+i,l=!se(s,c),u=p(s,c),f=l&&(u==null||u<-2.4);if(l&&(f?u=-1.6:u<d-.02||(u=d-.14)),!l&&u>=d||M&&!l&&!h(s,c))continue;let m=l||h(s,c)||h(e,t);if(!l&&!le&&!m&&Oe[n][0]<=u+.001&&Oe[n][1]<=u+.001)continue;let g=i,S=-r,w=e+.5+r*(l?f?1.15:.72:.54),T=t+.5+i*(l?f?1.15:.72:.54),E=w-g*.5,D=T-S*.5,ee=w+g*.5,O=T+S*.5,k=d+(m?.04:.02),A=0,j=r===0?.93:.86;for(;k>u+.001;){let n=Math.max(u-(m?.28:.08),k-1),s=k-n,c=A===0?Te[0]:A<3||Te[1]!==B.DIRT?Te[1]:B.STONE,l=v(c),d=l.vTop,f=d-s*(l.vTop-l.vBot),p=n<=u+.001,h=c===B.GRASS_SIDE||c===B.SNOW_SIDE||c===B.SAND,g=h?.96:p?.78:.94,_=A===0?1:.94,S=h?r===0?.99:.97:j,w=h?y:Ae(1,y,.55),T=h?b:Ae(1,b,.55),M=h?x:Ae(1,x,.55),te=.94+Ee(e*3+r,t*3+i,19+A)*.12,ne=[w*S*_*te,T*S*_*te,M*S*_*te],re=[w*S*g*te,T*S*g*te,M*S*g*te];C([[E+a,n,D+o],[ee+a,n,O+o],[ee+a,k,O+o],[E+a,k,D+o]],[r,0,i],[[l.u0,f],[l.u1,f],[l.u1,d],[l.u0,d]],[re,re,ne,ne]),k=n,A++}if(l){let n=f?8:4,s=d-.05,c=e+a+(r===1?1.08:r===-1?-n:0),l=e+a+(r===1?1+n:r===-1?-.08:1),u=t+o+(i===1?1.08:i===-1?-n:0),p=t+o+(i===1?1+n:i===-1?-.08:1),m=v(_),h=[y*.96,b*.96,x*.96];C([[c,s,u],[l,s,u],[l,s,p],[c,s,p]],[0,1,0],[[m.u0,m.vBot],[m.u1,m.vBot],[m.u1,m.vTop],[m.u0,m.vTop]],[h,h,h,h])}}}if(!_.length)continue;let w=new O;w.setAttribute(`position`,new We(_,3)),w.setAttribute(`normal`,new We(y,3)),w.setAttribute(`uv`,new We(b,2)),w.setAttribute(`color`,new We(x,3)),w.setIndex(_.length/3>65535?new Tt(S,1):new zt(S,1)),w.computeBoundingSphere(),w.computeBoundingBox();let T=new yt(w,t);T.castShadow=!0,T.receiveShadow=!0,T.matrixAutoUpdate=!1,d.add(T),g.push(T)}return d}var K=(e,t,n,r,i=0,a=.07)=>U(e,a,l(t,n,r,i));function q(e){let t=[];for(let[n,r,i,a,o]of e){let e=n.build(r,i,a,o);for(let n of[`solid`,`glow`,`window`])e[n]&&t.push({geo:e[n],kind:n})}return t}function lo(e,t,n,r,i,a,o,s=!1){let c=Math.ceil(a)+1;for(let l=r;l<i;l++)for(let r=Math.floor(n-c);r<=Math.ceil(n+c);r++)for(let i=Math.floor(t-c);i<=Math.ceil(t+c);i++){let c=i+.5-t,u=r+.5-n;if(c*c+u*u<=a*a){let t=typeof o==`function`?o(i,l,r):o;t!=null&&e.set(i,l,r,t,s)}}}function uo(e,t,n,r,i,a,o=!1){i.forEach((i,s)=>lo(e,t,n,r+s,r+s+1,i,a,o))}function fo(e,t,n,r,i,a,o,s,c,u=.35,d=!1){for(let f=Math.floor(r-o-1);f<=Math.ceil(r+o+1);f++)for(let p=Math.floor(n-a-1);p<=Math.ceil(n+a+1);p++)for(let m=Math.floor(t-i-1);m<=Math.ceil(t+i+1);m++){let h=(m+.5-t)/i,g=(p+.5-n)/a,_=(f+.5-r)/o,v=h*h+g*g+_*_;if(v<=1+(l(m,p,f,c)-.5)*u){let t=typeof s==`function`?s(m,p,f,v):s;t!=null&&e.set(m,p,f,t,d)}}}var po=[2058819,2652746,2252864,3115602];function mo(e,t=!1){let n=new Kt(e*97+5),r=new W(6,18,6);r.box(1,0,1,5,18,5,(t,n,r)=>{let i=l(t,0,r,e)>.6?.82:1;return m(K(5978917,t,n,r,e,.1),i)}),r.box(0,0,1,1,2,5,(t,n,r)=>K(5059103,t,n,r,e)),r.box(5,0,1,6,2,5,(t,n,r)=>K(5059103,t,n,r,e)),r.box(1,0,0,5,2,1,(t,n,r)=>K(5059103,t,n,r,e)),r.box(1,0,5,5,2,6,(t,n,r)=>K(5059103,t,n,r,e));let i=n.int(6,7),a=[];for(let e=0;e<5;e++){let t=i-e*1.2;a.push(t,t-1)}a.push(1.4,.9);let o=new W(i*2+4,a.length+1,i*2+4),s=i+2,c=po.map(e=>n.chance(.5)?e:m(e,.95));return a.forEach((n,r)=>{let i=r/a.length;for(let a=0;a<o.sz;a++)for(let u=0;u<o.sx;u++){let d=u+.5-s,f=a+.5-s,p=Math.sqrt(d*d+f*f),h=Math.atan2(f,d);if(p<=n+(l(u,r,a,e)*.9+Math.sin(h*5+r)*.35)*.55-(r%2==1?.2:0)){let s=c[Math.floor(l(u,r,a,e+3)*c.length)];s=v(s,4169818,i*.45),s=m(s,r%2==0?.82:1),t&&(r%2==1||i>.55)&&p<n-.4&&(s=v(s,15923455,.88)),o.set(u,r,a,K(s,u,r,a,e,.06))}}}),q([[r,.125,3,0,3],[o,.25,s,-3.2,s]])}function ho(e,t=`green`){let n=new Kt(e*31+7),r=t===`birch`,i=t===`maple`,a=r?15986404:i?7223332:6964521,o=r?14538438:i?5515288:5913122,s=r?15196368:i?6434846:6241572,c=new W(9,16,9);c.box(2,0,2,6,16,6,(t,n,i)=>r&&(n%4==0||n%4==1&&l(t,n,i,e)>.55)?2762274:m(K(a,t,n,i,e,.08),l(t,0,i,e)>.62?.86:1)),c.box(1,0,2,2,3,6,(t,n,r)=>K(o,t,n,r,e)),c.box(6,0,2,7,3,6,(t,n,r)=>K(o,t,n,r,e)),c.box(2,0,1,6,3,2,(t,n,r)=>K(o,t,n,r,e)),c.box(2,0,6,6,3,7,(t,n,r)=>K(o,t,n,r,e)),c.line(4,11,4,8,15,4,(t,n,r)=>K(s,t,n,r,e),2),c.line(4,10,4,0,14,5,(t,n,r)=>K(s,t,n,r,e),2);let u=new W(22,16,22),d={green:[3115583,4169543,5748304,7785564],blossom:[16030401,16758739,15237040,16765924],autumn:[14250542,15242031,13194538,15839549],teal:[2787946,3711098,5224586,8116646],birch:[9418826,13032546,6986296,13822072],maple:[12855848,14830114,15759920,11017252]}[t],f=(n,r,i,a)=>{let o=z(r/14,0,1),s=z(Math.floor(o*3.2+(l(n,r,i,e+5)-.5)*1.8+(a||0)*.5),0,3),c=d[s];return t===`blossom`&&l(n,r,i,e+8)>.72&&(c=4892746),K(m(c,.78+o*.3),n,r,i,e,.05)};fo(u,11,7.5,11,7.5,5,7.5,f,e,.5);for(let t=0;t<5;t++){let r=t/5*Math.PI*2+n.range(0,1);fo(u,11+Math.cos(r)*5.5,5+n.range(-1,2.5),11+Math.sin(r)*5.5,n.range(3.2,4.5),n.range(2.6,3.4),n.range(3.2,4.5),f,e+t,.5)}return fo(u,11+n.range(-2,2),11,11+n.range(-2,2),4.6,3.2,4.6,f,e+9,.5),q([[c,.125,4.5,0,4.5],[u,.25,11,-5.5,11]])}function go(e){let t=new Kt(e*13+3),n=3.4,r=new W(16,30,16),i=(t,n,r)=>{let i=Math.atan2(r+.5-8,t+.5-8),a=Math.sin(i*9+l(t>>1,0,r>>1,e)*3)>.35?.78:1,o=m(K(5652524,t,n,r,e,.1),a),s=Math.cos(i-.6);return l(t,n>>1,r,e+4)*.7+s*.3+(n<6?.1:0)>.74&&(o=K(v(4033084,5873738,l(t,n,r,1)),t,n,r,e,.1)),o};for(let e=0;e<30;e++){let t=e<4?(4-e)*.55:0,a=e>24?(e-24)*.08:0;lo(r,8,8,e,e+1,n+t-a,i)}for(let e=0;e<4;e++){let a=e/4*Math.PI*2+t.range(0,1);r.line(8+Math.cos(a)*n,3,8+Math.sin(a)*n,8+Math.cos(a)*6.8,0,8+Math.sin(a)*6.8,i,3)}let a=new W(22,14,22),o=[2062936,2789480,4173434,6737808],s=(t,n,r,i)=>{let a=z(n/10,0,1),s=z(Math.floor(a*3+(l(t,n,r,e+5)-.5)*1.6),0,3);return K(m(o[s],.8+a*.25),t,n,r,e,.05)};return fo(a,11,6,11,9,4.5,9,s,e,.5),fo(a,6,5,8,5.5,4,5.5,s,e+1,.5),fo(a,16,5,14,5.5,4,5.5,s,e+2,.5),fo(a,11,9,11,6,3.4,6,s,e+3,.5),q([[r,.25,8,0,8],[a,.5,11,-14,11]])}function _o(e,t=`green`){let n=new Kt(e*7+1),r=new W(7,9,7),[i,a]={green:[4889141,8048719],forest:[3112778,5748339],gold:[10135612,15126357]}[t],o=n.int(3,4);for(let t=0;t<o;t++){let t=n.int(1,5),o=n.int(1,5),s=n.int(4,8),c=n.int(-1,1),l=n.int(-1,1);for(let n=0;n<s;n++){let u=n/s,d=+(u>.55);r.set(t+c*d,n,o+l*d,K(v(i,a,u),t,n,o,e,.06))}}return q([[r,.1,3.5,0,3.5]])}function vo(e,t,n=16765503){let r=new Kt(e*11+2),i=new W(5,12,5),a=r.int(5,8);for(let t=0;t<a;t++)i.set(2,t,2,K(3968821,2,t,2,e));return i.set(3,2,2,4892220),i.set(1,3,2,4892220),i.set(1,a,2,t),i.set(3,a,2,t),i.set(2,a,1,t),i.set(2,a,3,t),i.set(2,a,2,n),i.set(2,a+1,2,m(t,1.1)),q([[i,.1,2.5,0,2.5]])}function yo(e){let t=new Kt(e*5+9),n=new W(17,9,17),r=t.int(6,8);for(let i=0;i<r;i++){let a=i/r*Math.PI*2+t.range(-.2,.2),o=t.range(5.5,7.5);for(let t=0;t<=1;t+=.08){let r=8+Math.cos(a)*t*o,i=8+Math.sin(a)*t*o,s=1+Math.sin(t*Math.PI*.85)*3.2-t*t*.6,c=K(v(2984522,6472826,t),Math.floor(r),Math.floor(s),Math.floor(i),e,.06);n.set(Math.floor(r),Math.floor(s),Math.floor(i),c),t>.25&&t<.9&&Math.floor(t*12)%2==0&&(n.set(Math.floor(r-Math.sin(a)),Math.floor(s),Math.floor(i+Math.cos(a)),c),n.set(Math.floor(r+Math.sin(a)),Math.floor(s),Math.floor(i-Math.cos(a)),c))}}return q([[n,.09,8.5,0,8.5]])}function bo(e,t=!1){let n=new W(14,10,14),r=[2785093,3511375,4762203,6472300];return fo(n,7,4.5,7,6,4,6,(n,i,a)=>{let o=z(i/8,0,1);return t&&l(n,i,a,e+2)>.93?14694994:K(m(r[Math.floor(z(o*3+l(n,i,a,e)*1.4,0,3))],.85+o*.2),n,i,a,e,.05)},e,.6),q([[n,.125,7,0,7]])}function xo(e,t=`red`){let n=new Kt(e*3+1),r=new W(14,12,14),[i,a]={red:[14235951,16734790],brown:[10117688,12287562],purple:[9063112,11958512],glow:[3793096,10158063]}[t],o=n.int(2,3);for(let s=0;s<o;s++){let o=4+s*3+n.int(-1,1),c=4+n.int(-2,3),u=n.int(3,5),d=n.range(2.4,3.6);lo(r,o,c,0,u,1,(t,n,r)=>K(15787728,t,n,r,e,.05)),fo(r,o,u+.5,c,d,d*.62,d,(n,r,o,s)=>t===`red`&&l(n,r,o,e)>.86&&r>=u?16774368:K(v(i,a,z((r-u)/3,0,1)),n,r,o,e,.05),e+s,.1,t===`glow`)}return q([[r,.09,7,0,7]])}function So(e,t=`red`){let n=new W(24,22,24),[r,i]={red:[13119530,16734280],pink:[14178970,16747716],purple:[8011712,11696880],blue:[3117008,8177919]}[t];return lo(n,12,12,0,11,2.6,(t,n,r)=>K(v(15985366,14207400,l(t,n,r,e)),t,n,r,e,.04)),fo(n,12,11,12,10,5.5,10,(t,n,a,o)=>n<11?K(16181704,t,n,a,e,.05):l(t>>1,n>>1,a>>1,e)>.8&&n>11?16774884:K(v(r,i,z((n-11)/5,0,1)),t,n,a,e,.05),e,.12),q([[n,.125,12,0,12]])}function Co(e,t=!1){let n=new Kt(e*17+2),r=new W(16,12,16),i=n.range(3.5,t?7:5),a=n.range(3.5,t?7:5),o=n.range(2.4,t?5.4:3.6);return fo(r,8,o*.8,8,i,o,a,(t,n,r)=>{let i=n>o*1.4,a=K(v(8225674,10133670,l(t>>1,n>>1,r>>1,e)),t,n,r,e,.08);return i&&l(t,n,r,e+5)>.45&&(a=K(5148476,t,n,r,e,.1)),a},e,.4),q([[r,.125,8,0,8]])}function wo(e){let t=new W(14,8,14);return lo(t,7,7,0,5,4.2,(t,n,r)=>{if(n===4){let e=Math.hypot(t+.5-7,r+.5-7);return Math.floor(e)%2==0?14267002:12686681}return m(K(6964521,t,n,r,e,.1),l(t,0,r,e)>.6?.8:1)}),lo(t,7,7,0,2,5.4,(t,n,r)=>K(5913122,t,n,r,e,.1)),lo(t,7,7,4,6,1.6,(t,n,r)=>l(t,n,r,e)>.4?15158332:16766896),q([[t,.125,7,0,7]])}function To(e=1){let t=new W(56,18,24),n=(t,n,r)=>K(4927520,t,n,r,e,.06),r=(t,n,r)=>K(6898472,t,n,r,e+1,.07),i=(t,n,r)=>{let i=[10119740,8738095,11696712,7753775];return K(i[Math.floor(l(t>>1,n,r,e+2)*i.length)],t,n,r,e+2,.06)};t.box(0,6,3,56,9,6,n),t.box(0,6,18,56,9,21,n);for(let e=4;e<56;e+=8)t.box(e,5,2,e+2,8,22,r);for(let e=0;e<56;e+=3)t.box(e,8,3,Math.min(56,e+2),10,21,i);for(let e of[3,51])t.box(e,0,4,e+3,8,7,n),t.box(e,0,17,e+3,8,20,n);for(let e=1;e<56;e+=8)t.box(e,10,1,e+2,16,4,r),t.box(e,10,20,e+2,16,23,r);return t.box(0,12,1,56,14,3,r),t.box(0,12,21,56,14,23,r),t.box(0,15,1,56,17,3,n),t.box(0,15,21,56,17,23,n),q([[t,.375,28,0,12]])}function Eo(e){let t=new W(24,9,9);for(let n=0;n<24;n++)for(let r=0;r<8;r++)for(let i=0;i<8;i++){let a=Math.hypot(r+.5-3.8-.2,i+.5-4);if(a<=3.6){let o=m(K(6964521,n,r,i,e,.1),l(n,r,i,e+1)>.65?.8:1);r>5&&l(n,r,i,e+2)>.45&&(o=K(5148476,n,r,i,e,.1)),(n===0||n===23)&&(o=a<2.6?13805934:o),t.set(n,r,i,o)}}return q([[t,.125,12,0,4.5]])}function Do(e){let t=new Kt(e+4),n=new W(7,22,7);for(let r=0;r<3;r++){let i=t.int(1,5),a=t.int(1,5),o=t.int(12,20);for(let t=0;t<o;t++)n.set(i,t,a,K(5937724,i,t,a,e));if(r<2)for(let t=o-3;t<o;t++)n.set(i,t,a,K(7031338,i,t,a,e))}return q([[n,.08,3.5,0,3.5]])}function Oo(e,t=!1){let n=new W(12,3,12);return lo(n,6,6,0,1,4.6,(t,n,r)=>{let i=Math.atan2(r+.5-6,t+.5-6);return i>.1&&i<.5?null:K(4168266,t,n,r,e,.1)}),t&&(lo(n,6,6,1,2,1.8,16752324),n.set(6,2,6,16769658)),q([[n,.1,6,0,6]])}function ko(e=0,t=[16742938,16764746]){let n=new W(6,34,6);return n.box(2,0,2,4,24,4,(t,n,r)=>K(7031339,t,n,r,e,.1)),n.box(1,22,1,5,25,5,(t,n,r)=>K(4079686,t,n,r,e,.08)),n.box(2,25,2,4,28,4,t[0],!0),n.box(2,28,2,4,30,4,t[1],!0),n.set(2,30,2,16773552,!0),q([[n,.0625,3,0,3]])}function Ao(e,t=0){let n=new W(16,26,16),r=[10838586,11825471,9392688,7240842][t%4],i=[[3,4,5,5.5,6,6,6,5.5,5,4,3,3,4,4],[4,5,6,6,5,4,3,3,3,4,5,5],[3,4,4.5,5,5,4.5,4,3,2.4,2.4,3,3.6,3.6]][t%3];return uo(n,8,8,0,i,(t,n,a)=>{let o=K(r,t,n,a,e,.08);return(n===4||n===5)&&(o=m(o,.75)),n===i.length-1&&(o=m(o,1.2)),o}),q([[n,.0625,8,0,8]])}function jo(e){let t=new W(14,14,14),n=10119997;return t.box(1,0,1,13,12,13,(t,r,i)=>+(t<3||t>10)+ +(r<2||r>9)+ +(i<3||i>10)>=2?K(6964519,t,r,i,e,.08):K(r%4==0?m(n,.82):n,t,r,i,e,.07)),q([[t,.0625,7,0,7]])}function Mo(e=1){let t=new W(30,18,16),n=(t,n,r)=>K(n%3==0?8015404:9198644,t,n,r,e,.08),r=(t,n,r)=>K(3882566,t,n,r,e+1,.06);t.box(3,6,3,27,8,13,n),t.box(3,8,3,27,13,5,n),t.box(3,8,11,27,13,13,n),t.box(3,8,3,5,13,13,n),t.box(25,8,5,27,12,11,n),t.box(1,8,6,3,10,10,r);for(let[e,n]of[[8,2],[22,2],[8,13],[22,13]])for(let i=1;i<8;i++)for(let a=e-3;a<=e+3;a++){let o=a-e,s=i-4;o*o+s*s>10||t.set(a,i,n,o===0&&s===0?12106950:r(a,i,n))}return t.box(8,8,5,16,11,11,(t,n,r)=>K(6964519,t,n,r,e,.07)),q([[t,.0625,15,0,8]])}function No(e){let t=new W(16,20,16);return uo(t,8,8,0,[4.4,5.2,5.8,6.1,6.2,6.2,6.2,6.2,6.1,5.8,5.2,4.4],(t,n,r)=>n===2||n===3||n===8||n===9?K(3816772,t,n,r,e,.08):K(Math.floor((Math.atan2(r+.5-8,t+.5-8)+Math.PI)*4)%2==0?9067056:7752232,t,n,r,e,.07)),lo(t,8,8,11,12,4.2,(t,n,r)=>K(10119997,t,n,r,e,.06)),q([[t,.0625,8,0,8]])}function Po(e){let t=new W(18,14,14);t.box(2,0,2,16,7,12,(t,n,r)=>t<4||t>13||n<1?K(3816772,t,n,r,e,.06):K(n%3==0?8211496:9394992,t,n,r,e,.07));for(let n=2;n<12;n++){let r=Math.round(Math.sqrt(Math.max(0,25-(n-7)*(n-7)))*.62);for(let i=7;i<7+r;i++)for(let r=2;r<16;r++){let a=r<4||r>13;t.set(r,i,n,a?K(3816772,r,i,n,e,.06):K(9394992,r,i,n,e,.07))}}return t.box(8,5,12,10,8,13,15120188),q([[t,.0625,9,0,7]])}function Fo(e){let t=new W(20,14,14);return t.box(1,0,1,19,11,13,(t,n,r)=>{if(t===6||t===13)return K(8082480,t,n,r,e,.06);let i=(t*3+n*5+r)%4==0?.88:1;return m(K(14729045,t,n,r,e,.1),i)}),q([[t,.0625,10,0,7]])}function Io(e,t=!0){let n=new W(18,16,4),r=(t,n,r)=>K(8015404,t,n,r,e,.1);return t&&(n.box(0,0,0,3,14,3,(t,n,r)=>K(7029541,t,n,r,e,.1)),n.box(0,14,0,3,15,3,(t,n,r)=>K(9067059,t,n,r,e,.08))),n.box(3,3,0,18,6,2,r),n.box(3,8,0,18,11,2,r),q([[n,.0625,0,0,0]])}function Lo(e){let t=new W(20,30,6);return t.box(8,0,1,11,26,4,(t,n,r)=>K(7029541,t,n,r,e,.08)),t.box(2,18,2,17,24,4,(t,n,r)=>K(10119997,t,n,r,e,.06)),t.box(3,19,4,16,20,5,3810324),t.box(3,21,4,12,22,5,3810324),t.box(1,19,2,2,23,4,10119997),q([[t,.0625,10,0,3]])}function Ro(e){let t=new W(10,46,10);return t.box(4,0,4,6,34,6,(t,n,r)=>K(3092534,t,n,r,e,.05)),t.box(3,0,3,7,3,7,3947844),t.box(2,34,2,8,36,8,3947844),t.box(3,36,3,7,42,7,16765562,!0),t.box(2,42,2,8,44,8,3092534),t.box(4,44,4,6,46,6,3092534),q([[t,.0625,5,0,5]])}function zo(e){let t=new W(28,48,28),n=(t,n,r)=>{let i=Math.floor(n/2),a=Math.atan2(r+.5-14,t+.5-14),o=Math.floor((a+Math.PI)*5+i%2*.5);n%2;let s=[9080726,10133670,8159880,10920858][Math.abs(o+i*3)%4];return K(s,t,n,r,e,.06)};for(let e=0;e<8;e++)lo(t,14,14,e,e+1,8.2,(t,r,i)=>Math.hypot(t+.5-14,i+.5-14)<5.6?e<5&&e===4?2848944:null:n(t,r,i));lo(t,14,14,4,5,5.6,3836608),t.box(5,8,12,8,30,15,(t,n,r)=>K(7029541,t,n,r,e,.08)),t.box(20,8,12,23,30,15,(t,n,r)=>K(7029541,t,n,r,e,.08)),t.box(5,28,12,23,31,15,(t,n,r)=>K(8015404,t,n,r,e,.08));for(let n=0;n<9;n++){let r=11-n,i=[4160889,4885638,3500904][n%3];if(t.box(14-r,31+n,9,14+r,32+n,19,(t,n,r)=>K(i,t,n,r,e,.08)),r<=1)break}return t.box(13,14,13,15,28,14,11901546),t.box(11,11,12,17,15,16,(t,n,r)=>K(9067056,t,n,r,e,.06)),q([[t,.0625,14,0,14]])}function Bo(e){let t=new W(24,40,8);t.box(11,0,3,13,28,5,(t,n,r)=>K(7029541,t,n,r,e)),t.box(2,22,3,22,24,5,(t,n,r)=>K(7029541,t,n,r,e)),t.box(8,12,2,16,24,6,(t,n,r)=>K(5208240,t,n,r,e,.1)),t.box(8,17,2,16,19,6,(t,n,r)=>K(13062202,t,n,r,e)),t.box(8,26,1,16,34,7,(t,n,r)=>K(14268538,t,n,r,e,.08)),t.box(9,29,7,11,31,8,1709072),t.box(13,29,7,15,31,8,1709072),t.box(10,27,7,14,28,8,1709072),t.box(6,34,0,18,36,8,(t,n,r)=>K(5913124,t,n,r,e)),t.box(9,36,2,15,40,6,(t,n,r)=>K(5913124,t,n,r,e));for(let e=0;e<6;e++)t.box(1-e%2,20-e,3,2,21-e,5,15126357),t.box(22,20-e,3,23+e%2,21-e,5,15126357);return q([[t,.0625,12,0,4]])}function Vo(e,t=!0){let n=new Kt(e*5+3),r=new W(10,14,10);for(let i=0;i<4;i++){let a=1+i%2*5+n.int(0,2),o=1+Math.floor(i/2)*5+n.int(0,2),s=n.int(8,11);for(let n=0;n<s;n++)r.set(a,n,o,K(t?12169802:8040522,a,n,o,e,.07));for(let n=s-3;n<s+1;n++)r.set(a,n,o,K(t?15255118:10144597,a,n,o,e,.07));r.set(a+1,s-2,o,t?15255118:10144597),r.set(a,s-1,o+1,t?14267456:9091912)}return q([[r,.09,5,0,5]])}function Ho(e,t=12086271){let n=new Kt(e+1),r=new W(12,16,12);for(let e=0;e<4;e++){let e=n.int(2,9),i=n.int(2,9),a=n.int(6,14);for(let n=0;n<a;n++){let o=n>a-3?0:+(n<a*.45);for(let s=0;s<=o;s++)for(let c=0;c<=o;c++)r.set(e+s,n,i+c,v(m(t,.7),t,n/a),!0)}r.set(e,a,i,16777215,!0)}return q([[r,.0625,6,0,6]])}var Uo={G:[`.XXX.`,`X...X`,`X....`,`X.XXX`,`X...X`,`X...X`,`.XXX.`],U:[`X...X`,`X...X`,`X...X`,`X...X`,`X...X`,`X...X`,`.XXX.`],I:[`XXXXX`,`..X..`,`..X..`,`..X..`,`..X..`,`..X..`,`XXXXX`],L:[`X....`,`X....`,`X....`,`X....`,`X....`,`X....`,`XXXXX`],D:[`XXXX.`,`X...X`,`X...X`,`X...X`,`X...X`,`X...X`,`XXXX.`],A:[`.XXX.`,`X...X`,`X...X`,`XXXXX`,`X...X`,`X...X`,`X...X`],N:[`X...X`,`XX..X`,`X.X.X`,`X..XX`,`X...X`,`X...X`,`X...X`],T:[`XXXXX`,`..X..`,`..X..`,`..X..`,`..X..`,`..X..`,`..X..`],R:[`XXXX.`,`X...X`,`X...X`,`XXXX.`,`X.X..`,`X..X.`,`X...X`],E:[`XXXXX`,`X....`,`X....`,`XXXX.`,`X....`,`X....`,`XXXXX`]};function Wo(e){let{w:t=5,d:n=4,wh:r=24,seed:i=1,wall:a=9067060,roof:o=[4160889,4885638,3500904,5874074,9063224],sign:s=null,bigDoor:c=!1,chimney:u=!0,pitch:d=1.1,shutters:f=4160889,flowers:p=!0,stone:h=9080726}=e,g=t*8,_=n*8,v=Math.round((g/2+3)*d),y=g+10,b=r+v+8,x=_+14,S=new W(y,b,x),C=5+g/2,w=5+_-1;new Kt(i*41+3);let T=(e,t,n)=>K(3810325,e,t,n,i,.08),E=(e,t,n)=>{let r=a;r=t%4==0?m(r,.8):r;let o=Math.floor(t/4)%2?7:0;return(e+n+o)%14==0&&(r=m(r,.78)),K(r,e,t,n,i,.07)};S.box(4,0,4,5+g+1,5,5+_+1,(e,t,n)=>{let r=Math.floor(t/2),a=Math.floor((e+n+r%2*2)/4),o=[9080726,10133670,8159880,10920858][Math.abs(a*7+r)%4];return K((t%2,o),e,t,n,i,.07)}),S.box(5,5,5,5+g,r,5+_,(e,t,n)=>{let i=e-5,a=n-5;if((i<2||i>=g-2||a<2||a>=_-2)&&(i<2||i>=g-2)&&(a<2||a>=_-2)||t>=r-3||t<7)return T(e,t,n);let o=n>=w-1||n<=5,s=e===5||e===5+g-1;return o&&(i%16==0||i%16==1)||s&&(a%16==0||a%16==1)?T(e,t,n):E(e,t,n)});let D=e=>r+Math.round((g/2+3-Math.abs(e+.5-C))*d),ee=(e,t,n)=>{let r=Math.abs(e+.5-C),a=Math.floor(r/3),s=Math.floor((t+a%2*2)/4),c=o[Math.floor(l(s,a,1,i)*(o.length-.001))];l(s,a,2,i)>.22&&(c=o[Math.floor(l(s,a,3,i)*4)]);let u=r-a*3;return u<1?c=m(c,.72):u>=2&&(c=m(c,1.12)),(t+a%2*2)%4==0&&(c=m(c,.85)),K(c,e,n,t,i,.05)};for(let e=2;e<5+g+3;e++){let t=D(e);for(let n=2;n<5+_+3;n++){for(let i=Math.max(r-1,t-3);i<=t;i++)S.set(e,i,n,i>=t-1?ee(e,n,i):m(4863526,.9));if(n>=5&&n<5+_&&e>=5&&e<5+g)for(let i=r;i<t-3;i++){let t=n===5||n===5+_-1;S.set(e,i,n,t?E(e,i,n):3811872)}}}let O=D(Math.floor(C));for(let e=2;e<5+_+3;e++)S.box(Math.floor(C)-1,O+1,e,Math.floor(C)+1,O+2,e+1,(e,t,n)=>K(m(o[0],.8),e,t,n,i,.05));for(let e of[2,5+_+2])for(let t=2;t<5+g+3;t++){let n=D(t);S.set(t,n-2,e,T(t,n-2,e)),S.set(t,n-3,e,T(t,n-3,e))}let k=r+Math.floor(v*.42);((e,t,n,r,i)=>{for(let i=-5;i<=n;i++)for(let a=-5;a<=n;a++)if(Math.abs(a)+Math.abs(i)<=n){let o=Math.abs(a)+Math.abs(i)===n?2956304:1445900;S.set(e+a,t+i,r,o),Math.abs(a)+Math.abs(i)<n&&S.set(e+a,t+i,r,16762982,2)}})(Math.floor(C),k+2,5,w,!0);let A=c?16:12,j=c?22:18,M=Math.floor(C-A/2);S.carve(M,5,w-1,M+A,5+j,w+1),S.box(M-2,5,w,M,5+j+2,w+2,T),S.box(M+A,5,w,M+A+2,5+j+2,w+2,T),S.box(M-2,5+j,w,M+A+2,5+j+2,w+2,T),S.box(M,5,w-1,M+A,5+j,w,(e,t,n)=>{let r=e-M;if(c&&(r===A/2-1||r===A/2))return 2364939;let a=r%4==0?4860950:6240798;return(t===10||t===5+j-6)&&(a=3816772),K(a,e,t,n,i,.07)}),S.box(M+A-3,14,w,M+A-1,16,w+1,15120188),c&&S.box(M+2,14,w,M+4,16,w+1,15120188),S.box(M-3,0,w+1,M+A+3,2,w+4,(e,t,n)=>K(9409691,e,t,n,i,.06)),S.box(M-1,2,w+1,M+A+1,4,w+3,(e,t,n)=>K(10133670,e,t,n,i,.06));let te=(e,t,n,r=`z`,a=1,o=f)=>{let s=(i,o,s,c,l=!1)=>{r===`z`?S.set(e+i,t+o,n+s*a,c,l):S.set(n+s*a,t+o,e+i,c,l)},c=(i,o,s)=>{r===`z`?S.clear(e+i,t+o,n+s*a):S.clear(n+s*a,t+o,e+i)};for(let t=-1;t<=8;t++)for(let n=-1;n<=9;n++){if(t<0||t>=8||n<0||n>=9){s(t,n,0,2956304),s(t,n,1,3810325);continue}let r=t===3||t===4||n===4;c(t,n,0),r?s(t,n,-1,2956304):s(t,n,-1,K(16762982,t,n,e,i,.08),2)}for(let t of[-4,9])for(let n=0;n<3;n++)for(let r=-1;r<=9;r++){let a=K(r%3==0?m(o,.85):o,n,r,e,i,.06);s(t+n,r,1,a)}if(p){for(let e=-1;e<=8;e++)for(let t=-3;t<=-2;t++)for(let n=1;n<=2;n++)s(e,t,n,K(7029541,e,t,n,i,.08));for(let t=-1;t<=8;t++){let n=[16740241,16765503,16777215,11958512][Math.floor(l(t,e,1,i)*4)];s(t,-1,1,l(t,e,2,i)>.4?n:4168266),s(t,-1,2,l(t,e,3,i)>.5?n:4168266)}}},ne=(g-A)/2;ne>=10&&(te(5+Math.floor(ne/2)-3,11,w,`z`,1),te(5+g-Math.floor(ne/2)-5,11,w,`z`,1));for(let e=0;e<Math.max(1,Math.floor(_/20));e++){let t=11+e*18;t+8<5+_-2&&(te(t,12,5,`x`,-1),te(t,12,5+g-1,`x`,1))}if(s){let e=s.split(``),t=e.length*6+5,n=Math.floor(C-t/2),r=5+j+4;S.box(n,r,w+1,n+t,r+11,w+3,(e,t,n)=>K(t%4==0?4860950:5912608,e,t,n,i,.06)),S.box(n-1,r-1,w+1,n+t+1,r,w+4,2956304),S.box(n-1,r+11,w+1,n+t+1,r+12,w+4,2956304),S.box(n-1,r-1,w+1,n,r+12,w+4,2956304),S.box(n+t,r-1,w+1,n+t+1,r+12,w+4,2956304),e.forEach((e,t)=>{let a=Uo[e];if(a)for(let e=0;e<7;e++)for(let o=0;o<5;o++)a[e][o]===`X`&&(S.set(n+3+t*6+o,r+9-e,w+3,K(15192995,o,e,t,i,.06)),S.set(n+3+t*6+o,r+9-e,w+4,K(15785906,o,e,t,i,.05)))})}if(u){let e=Math.floor(C)+Math.floor(g/4),t=D(e)+7;S.box(e,r-2,10,e+6,t,16,(e,t,n)=>K([9080726,7830916,10133670][Math.floor(l(e,t,n,5)*3)],e,t,n,i,.06)),S.box(e-1,t,9,e+7,t+2,17,(e,t,n)=>K(7172472,e,t,n,i,.06)),S.box(e+1,t,11,e+5,t+1,15,1908e3)}return q([[S,.125,5+g/2,0,5+_/2]])}function Go(e,t=3119758,n=15919827){let r=new W(32,28,40);for(let i=4;i<36;i++)for(let a=0;a<20;a++){let o=(20-a)/20*13;for(let s=Math.floor(16-o-1);s<=Math.ceil(16+o+1);s++){let c=Math.abs(s+.5-16);if(c>o+.3||c<o-1.6&&a>0)continue;let l=t;Math.floor((i-4)/6)%2,a<3&&(l=m(n,.8)),c-o;let u=i-4,d=Math.abs(u-16)/7+Math.abs(a-8.4)/5.5;d<1&&c>o-1.8&&(l=d>.62?n:m(n,1)),d<.5&&c>o-1.8&&(l=t),a===3&&(l=m(l,.85)),r.set(s,a,i,K(l,s,a,i,e,.06))}}for(let t of[1,38])r.box(15,19,t,17,23,t+2,(t,n,r)=>K(7029541,t,n,r,e,.08));r.box(15,20,2,17,21,38,7029541);for(let e=0;e<18;e++){let t=(20-e)/20*13*.62;for(let n=Math.floor(16-t);n<=Math.ceil(16+t);n++)Math.abs(n+.5-16)<=t&&e>1&&(r.clear(n,e,35),r.clear(n,e,34),r.set(n,e,33,1709072))}for(let e of[-1,1]){let t=Math.floor(16+e*15);for(let e of[6,33])r.box(t,0,e,t+1,4,e+1,7029541)}return q([[r,.125,16,0,20]])}function Ko(e,t=[13123631,15919827],n=`apple`){let r=new W(40,40,28),i=(t,n,r)=>K(8015404,t,n,r,e,.08);for(let[e,t]of[[2,2],[35,2],[2,23],[35,23]])r.box(e,0,t,e+3,26,t+3,i);r.box(3,0,18,37,12,25,(t,n,r)=>n>9?K(10119997,t,n,r,e,.06):i(t,n,r));for(let t=6;t<34;t++)for(let i=19;i<24;i++){let a=Math.floor((t-6)/4);if(n===`potion`){if(t%4==1){let e=[16731498,5163263,8215807,6160288][a%4];r.set(t,12,i,14543088),r.set(t,13,i,e,!0),r.set(t,14,i,e,!0),i===21&&r.set(t,15,i,13153418)}}else n===`apple`?r.set(t,12,i,K(a%2?14432826:15769648,t,12,i,e,.1)):n===`pumpkin`?r.set(t,12,i,K(a%2?15237662:6989898,t,12,i,e,.1)):n===`timber`?(r.set(t,12,i,K(a%2?9067060:12887146,t,12,i,e,.08)),t%6==0&&(r.set(t,13,i,K(6964008,t,13,i,e,.06)),r.set(t+1<34?t+1:t,14,i,K(12041668,t,14,i,e,.05)))):n===`pick`?(r.set(t,12,i,K(a%2?10134443:7239296,t,12,i,e,.06)),t%6==0&&(r.set(t,13,i,K(12887146,t,13,i,e,.05)),r.set(t,14,i,K(14147302,t,14,i,e,.04)))):r.set(t,12,i,K(a%2?9087168:13687008,t,12,i,e,.1));(n===`apple`||n===`pumpkin`)&&(t+i)%3==0&&r.set(t,13,i,K(a%2?14432826:15769648,t,13,i,e,.1))}for(let n=0;n<28;n++){let i=26+Math.floor((27-n)*.42);for(let a=0;a<40;a++){let o=Math.floor(a/4)%2==0?t[0]:t[1];r.set(a,i,n,K(o,a,i,n,e,.05)),r.set(a,i-1,n,K(m(o,.85),a,i-1,n,e,.05))}}for(let e=0;e<40;e++){let n=Math.floor(e/4)%2==0?t[0]:t[1];e%4<3&&r.set(e,25,27,m(n,.9)),r.set(e,25+(e%4==1||e%4==2?-1:0),27,m(n,.9))}return q([[r,.1,20,0,14]])}function qo(e=6){let t=new W(18,16,18),n=(t,n,r)=>K(4080202,t,n,r,e,.07);uo(t,9,9,1,[3.4,4.6,5.6,6.1,6,5.2],n),lo(t,9,9,6,7,4.3,3014554,!0),lo(t,9,9,7,8,3.1,13172708,!0);for(let[e,r]of[[4,4],[12,4],[4,12],[12,12]])t.box(e,0,r,e+2,2,r+2,n);return t.box(1,4,8,3,6,11,n),t.box(15,4,8,17,6,11,n),q([[t,.07,9,0,9]])}function Jo(e=3){let t=new W(60,68,20),n=(t,n,r)=>{let i=Math.floor(n/4),a=Math.floor((t+i%2*4)/8),o=[4869722,5593446,4409172,6251376][Math.abs(a*5+i*3)%4],s=K(o,t,n,r,e,.07);return n%4==0&&(s=m(s,.85)),l(t>>1,n>>1,r>>1,e+9)>.82&&n<22&&(s=K(5209155,t,n,r,e,.1)),s},r=12745727,i=e=>{t.box(e-2,0,3,e+14,5,17,n),t.box(e,5,4,e+12,40,16,n),t.box(e-1,40,3,e+13,44,17,n);for(let n=0;n<4;n++){let i=9+n*7;t.box(e+5,i,16,e+7,i+4,17,r,!0),n%2==0?t.box(e+3,i+1,16,e+9,i+2,17,r,!0):t.box(e+4,i+3,16,e+8,i+4,17,r,!0)}};i(6),i(42);for(let e=44;e<66;e++)for(let r=4;r<56;r++){let i=Math.hypot(r+.5-30,e+.5-44);if(i<=20&&i>=12)for(let i=4;i<16;i++)t.set(r,e,i,n(r,e,i))}t.box(25,60,3,35,65,17,n),t.box(28,61,17,32,64,18,r,!0),t.box(29,62,17,31,63,18,16777215,!0);for(let e=0;e<5;e++){let n=Math.PI*(.15+e*.175),i=Math.round(30-Math.cos(n)*16),a=Math.round(44+Math.sin(n)*16);t.box(i,a,16,i+2,a+2,17,r,!0)}return t.box(12,5,16,20,8,19,n),t.box(40,5,16,48,8,19,n),q([[t,.125,30,0,10]])}function Yo(e=11){let t=new W(56,58,24),n=(t,n,r)=>{let i=Math.floor(n/4),a=Math.floor((t+i%2*3)/5),o=[7235422,8222059,6051406,9142902][Math.abs(a+i*3)%4],s=K(o,t,n,r,e,.055);return n%4==0&&(s=m(s,.8)),l(t>>2,0,r>>2,e)>.86&&(s=m(s,.72)),s},r=(t,n,r)=>K((t+n)%3==0?14131786:11039794,t,n,r,e,.05),i=(t,n,r)=>K(n%2?12872250:9260588,t,n,r,e,.06);t.box(1,0,1,54,3,22,n);for(let e=0;e<28;e++){let n=e/28*Math.PI*2,i=Math.round(28+Math.cos(n)*16),a=Math.round(12+Math.sin(n)*7);t.set(i,3,a,r(i,3,a)),t.set(i,3,a+1,r(i,3,a))}let a=e=>{t.box(e,3,5,e+11,7,18,n),t.box(e+1,7,6,e+10,38,17,n),t.box(e,38,5,e+11,42,18,n);for(let n of[12,20,28,36])t.box(e,n,5,e+11,n+2,18,r);t.box(e+4,16,17,e+7,18,20,r),t.box(e+4,22,17,e+7,27,20,r),t.set(e+5,24,19,8320767,!0),t.set(e+5,24,20,15334399,!0),t.box(e+3,30,17,e+8,33,20,i)};a(3),a(42);for(let e=36;e<56;e++)for(let i=2;i<54;i++){let a=Math.hypot(i+.5-28,e+.5-40);if(a>20||a<15)continue;let o=a>18.6||a<16.2;for(let a=6;a<17;a++)t.set(i,e,a,o?r(i,e,a):n(i,e,a))}t.box(24,52,5,32,57,18,r),t.box(26,53,17,30,56,20,14220287,!0),lo(t,8,8,7,18,2.1,i),lo(t,48,8,7,18,2.1,i),lo(t,8,8,16,18,2.4,r),lo(t,48,8,16,18,2.4,r),t.box(44,3,16,54,15,23,n),t.box(45,15,16,53,17,23,r),t.box(46,16,20,52,18,23,3794943,!0),t.box(47,8,22,51,12,23,1713192);for(let e=0;e<4;e++)t.set(47+e,10,22,e===1?8320767:13214042,!0);return t.build(.068,28,0,12)}function Xo(e=2){let t=new W(40,80,40);for(let n=0;n<52;n++){let r=13-n*.12;lo(t,20,20,n,n+1,r,(t,n,r)=>{if(n<12){let i=Math.floor(n/3),a=Math.floor((Math.atan2(r+.5-20,t+.5-20)+Math.PI)*6+i%2*.5);return K([9080726,10133670,8159880][Math.abs(a+i)%3],t,n,r,e,.07)}return K(Math.floor((Math.atan2(r+.5-20,t+.5-20)+Math.PI)*6)%3==0?5913124:15327176,t,n,r,e,.05)})}t.carve(17,0,28,23,10,34),t.box(17,0,30,23,10,32,(t,n,r)=>K(6240798,t,n,r,e,.07));for(let n=0;n<18;n++){let r=15-n*.85;if(r<1)break;lo(t,20,20,52+n,53+n,r,(t,n,r)=>{let i=Math.floor((Math.atan2(r+.5-20,t+.5-20)+Math.PI)*5),a=Math.floor(n/2);return K([11029042,12145978,9650220,13001795][Math.abs(i+a)%4],t,n,r,e,.06)})}t.box(19,70,19,21,73,21,4863526),t.box(16,38,31,24,46,33,(t,n,r)=>K(7029541,t,n,r,e,.06)),t.box(18,40,31,22,44,32,16762982,2);let n=new W(14,14,24);n.box(4,4,0,10,10,8,(t,n,r)=>K(4863526,t,n,r,e,.06)),n.box(5,5,8,9,9,12,(t,n,r)=>K(7029541,t,n,r,e,.06));let r=new W(60,60,4);for(let t=0;t<4;t++){let n=t*Math.PI/2,i=Math.cos(n),a=Math.sin(n);for(let n=2;n<28;n++){let o=30+i*n,s=30+a*n;r.set(Math.floor(o),Math.floor(s),1,K(5913124,n,t,0,e,.08)),r.set(Math.floor(o+1),Math.floor(s),1,K(5913124,n,t,1,e,.08))}let o=-a,s=i;for(let n=8;n<28;n++)for(let c=1;c<8;c++){let l=30+i*n+o*c,u=30+a*n+s*c,d=n%4==0||c%4==0;r.set(Math.floor(l),Math.floor(u),2,K(d?7031339:15787727,n,c,t,e,.05))}}return{body:q([[t,.125,20,0,20]]),hub:q([[n,.125,7,7,0]]),sails:q([[r,.125,30,30,0]])}}function Zo(e=3){let t=new W(32,40,22),n=(t,n,r)=>K(((t>>1)+(n>>1)+(r>>1))%2?8224646:7040629,t,n,r,e,.08),r=(t,n,r)=>K(2894382,t,n,r,e,.06);t.box(3,0,2,29,4,20,n),t.box(4,4,3,28,15,19,n),t.carve(9,5,11,23,12,19),t.box(9,5,3,23,12,11,r),t.box(9,4,11,23,5,19,r),t.box(10,5,12,22,7,19,(e,t,n)=>(e+n)%3==0?16757575:(e*7+n)%4==0?16734746:14232074,!0);for(let e=0;e<9;e++){let n=10+e*5%11,r=12+e*3%6,i=3+e%4;t.box(n,7,r,n+2,7+i,r+2,(e,t)=>t>8?16769658:16747034,!0)}return t.box(7,12,18,25,14,20,(t,n,r)=>K(4928032,t,n,r,e,.08)),t.box(5,15,4,27,19,18,n),t.box(7,19,6,25,24,16,n),t.box(11,24,8,21,40,14,n),t.box(10,38,7,22,40,15,(t,n,r)=>K(5592926,t,n,r,e,.06)),t.box(12,39,9,20,40,13,1709592),t.box(0,2,7,4,8,15,(t,n,r)=>K(6964519,t,n,r,e,.07)),t.box(0,6,8,3,8,14,(t,n,r)=>K(9071178,t,n,r,e,.07)),t.box(0,3,10,1,5,12,3816772),t.box(29,4,8,32,14,10,3816772),t.box(29,12,14,32,14,16,3816772),t.box(30,11,9,32,12,15,4869719),q([[t,.0625,16,0,11]])}var Qo=e=>(t,n,r)=>{let i=l(t,n,r,e);return U(i<.22?3021840:i<.5?4861980:i<.78?6044708:7227952,.08,i)},$o=e=>(t,n,r)=>{let i=l(t,n,r,e+9);return U(i<.28?4863012:i<.58?7229504:i<.82?9070668:4074012,.07,i)},es=(e,t,n)=>{let r=l(e,t,n,21);return U(r<.4?5918790:r<.75?8023648:4077618,.06,r)};function ts(e=1,t=`hut`){let n=t===`long`,r=t===`lean`,i=n?54:r?32:38,a=n?38:r?24:30,o=r?14:n?20:17,s=new W(i+10,o+24,a+10),c=Qo(e),u=$o(e);for(let t=4;t<5+i+1;t++)for(let n=4;n<5+a+1;n++){let r=2+Math.floor(l(t,0,n,e)*3);for(let i=0;i<r;i++){let r=l(t,i,n,e+2);s.set(t,i,n,U(r<.5?6052180:3815478,.07,r))}}let d=5+Math.floor(i/2)-(n?4:3),f=d+(n?8:6),p=r?9:12;for(let t=2;t<o;t++){let n=t&1;for(let r=5+n;r<5+i-n;r++)for(let o=5;o<5+a;o++){let u=r<=6+n||r>=5+i-2-n,m=o<=6||o>=5+a-2;(u||m)&&(o>=5+a-2&&r>=d&&r<f&&t<p||t%3==2&&l(r,t,o,e)>.55||s.set(r,t,o,c(r,t,o)))}}for(let[e,t]of[[4,4],[5+i-2,4],[4,5+a-2],[5+i-2,5+a-2]])s.box(e,1,t,e+3,o+3,t+3,c);let h=5+i/2;for(let t=2;t<5+a+3;t++){let n=(t-5)/a,c=Math.sin(n*Math.PI)*(r?1.2:3.2);for(let n=2;n<5+i+3;n++){let a=Math.abs(n+.5-h),d=(r?5:11)-a*(r?.28:.4)+c,f=o+Math.max(1,Math.round(d));for(let r=f-2;r<=f;r++)l(n,r,t,e+5)<.07||s.set(n,r,t,r===f?u(n,r,t):m(3811868,.9));a>i*.38&&l(n,1,t,e)>.35&&s.set(n,f-3,t,es(n,f,t))}}for(let t=7;t<5+a-2;t+=n?5:6){let n=o+(r?6:11);s.box(Math.floor(h)-1,n,t,Math.floor(h)+2,n+4,t+2,(t,n,r)=>U(14997696,.04,l(t,n,r,e)))}let g=d+3;return s.ellipsoid(g+.5,p+2,5+a-.2,2.4,2.1,1.8,(t,n,r)=>U(15129796,.04,l(t,n,r,e))),s.set(g,p+2,5+a,1446414),s.set(g+2,p+2,5+a,1446414),s.set(g+1,p+1,5+a,1446414),s.box(d,3,5+a-1,f,p-1,5+a+1,(t,n,r)=>l(t,n,r,e)<.15?null:u(t,n,r)),s.box(d-1,p,5+a-2,f+1,p+2,5+a+1,c),n&&(s.box(9,6,4,13,10,6,1709586),s.box(5+i-9,6,4,5+i-5,10,6,1709586)),q([[s,.0625,5+i/2,0,5+a/2]])}function ns(e=1){let t=new W(10,40,10),n=Qo(e);for(let e=0;e<28;e++){let r=e<3?4.2:3.15;for(let i=0;i<10;i++)for(let a=0;a<10;a++){let o=i+.5-5,s=a+.5-5;o*o+s*s>r*r||t.set(i,e,a,n(i,e,a))}}for(let e=28;e<40;e++){let r=3.1*(1-(e-28)/12);for(let i=0;i<10;i++)for(let a=0;a<10;a++){let o=i+.5-5,s=a+.5-5;o*o+s*s>r*r||t.set(i,e,a,m(n(i,e,a),1.08))}}for(let n of[6,16])for(let r=1;r<9;r++)for(let i=1;i<9;i++){let a=r-5,o=i-5;a*a+o*o<7||a*a+o*o>16||t.set(r,n,i,U(9072712,.05,l(r,n,i,e)))}return q([[t,.0625,5,0,5]])}function rs(e=1){let t=new W(26,30,8),n=Qo(e);return t.line(2,1,3,23,27,3,n,2),t.line(23,1,4,2,27,4,n,2),t.box(10,12,1,16,17,7,(t,n,r)=>U(9072712,.06,l(t,n,r,e))),q([[t,.0625,13,0,4]])}function is(e=1){let t=new W(36,18,8),n=Qo(e);t.box(0,12,2,36,16,6,n),t.box(2,16,3,6,18,5,n),t.box(30,16,3,34,18,5,n);for(let n=2;n<13;n++)for(let r=8;r<28;r++){let i=l(r,n,1,e);if(n<5&&i<.45||i<.08)continue;let a=i<.5?9054754:i<.8?7216150:10503218;t.set(r,n,5,U(a,.05,i)),i>.35&&t.set(r,n,6,U(m(a,.8),.04,i))}return t.box(16,6,6,20,10,7,1708558),t.box(17,8,6,19,9,7,15129796),q([[t,.0625,18,0,4]])}function as(e=1){let t=new W(26,62,14),n=Qo(e);t.box(11,0,4,15,58,8,n),t.box(9,0,2,17,3,10,(t,n,r)=>U(5920852,.06,l(t,n,r,e))),t.ellipsoid(13,4,6,3.2,2.6,2.4,(t,n,r)=>U(15129796,.04,l(t,n,r,e))),t.set(12,4,8,1446414),t.set(14,4,8,1446414),t.box(4,50,4,22,54,8,n);for(let n=28;n<51;n++){let r=Math.round((50-n)*.12);for(let i=3;i<23;i++){let a=l(i,n,2,e+4),o=30+Math.floor(l(i,0,3,e)*6);if(n<o||a<.06)continue;let s=Math.abs(i-13)<2&&n>36&&n<46?1708558:a<.55?9578526:a<.82?6953492:11551792,c=8+r;t.set(i,n,c,U(s,.05,a)),a>.4&&t.set(i,n,c+1,U(m(s,.78),.04,a))}}for(let n=5;n<21;n++)l(n,9,1,e)<.4||(t.set(n,54,6,es(n,54,6)),t.set(n,55,6,es(n,55,6)));return t.box(12,56,5,14,62,7,n),t.box(11,60,4,15,62,8,(t,n,r)=>U(15129796,.04,l(t,n,r,e))),q([[t,.0625,13,0,6]])}function os(e=1){let t=new W(22,16,22);for(let n=0;n<12;n++){let r=11+Math.round(Math.cos(n/12*Math.PI*2)*7),i=11+Math.round(Math.sin(n/12*Math.PI*2)*7),a=3+n%3;t.box(r-1,0,i-1,r+2,a,i+2,(t,r,i)=>U(5920852,.08,l(t,r,i,e+n)))}t.box(7,1,8,16,3,11,Qo(e)),t.box(8,2,6,12,4,16,Qo(e+1)),t.box(9,3,9,14,5,13,(e,t,n)=>(e+n)%2?16757575:16734746,!0);for(let e=0;e<7;e++){let n=9+e%4,r=9+e*2%4,i=4+e%4;t.box(n,5,r,n+2,5+i,r+2,(e,t)=>t>7?16769658:16747034,!0)}return q([[t,.0625,11,0,11]])}function ss(e=1){let t=new W(14,36,14),n=Qo(e);t.box(6,0,6,9,22,9,n);let r=(n,r)=>{t.ellipsoid(7,n,7,3.3,2.8,3.1,(t,n,i)=>U(15129796,.05,l(t,n,i,e+r))),t.set(6,n,10,1446414),t.set(8,n,10,1446414),t.set(7,n-1,10,1446414),t.box(5,n-2,9,6,n,11,15787728),t.box(8,n-2,9,9,n,11,15787728)};return r(24,1),r(30,2),t.box(4,18,6,10,20,8,(t,n,r)=>U(9072712,.05,l(t,n,r,e))),q([[t,.0625,7,0,7]])}function cs(e=1){let t=new W(28,26,10),n=Qo(e);return t.box(2,0,3,5,22,7,n),t.box(23,0,3,26,22,7,n),t.box(2,18,3,26,21,7,n),t.box(6,4,4,8,20,6,(t,n,r)=>U(n>14?5913122:10133672,.05,l(t,n,r,e))),t.box(5,16,3,10,18,7,6972764),t.box(12,6,4,14,20,6,(t,n,r)=>U(n>15?4861980:11580604,.04,l(t,n,r,e))),t.box(18,8,2,23,18,8,$o(e)),t.box(20,12,7,22,15,9,9054754),q([[t,.0625,14,0,5]])}function ls(e=1){let t=new W(22,24,6),n=Qo(e);t.box(1,0,1,4,22,4,n),t.box(18,0,1,21,20,4,n),t.box(1,18,1,21,21,4,n),t.box(3,4,3,19,18,5,$o(e));for(let e=6;e<16;e+=3)t.box(4,e,4,18,e+1,5,9072712);return q([[t,.0625,11,0,3]])}function us(e=1){let t=new W(16,8,14),n=(t,n,r)=>U(15129796,.05,l(t,n,r,e));return t.line(1,1,2,12,2,6,n,1),t.line(3,1,10,14,2,4,n,1),t.line(2,1,6,8,3,12,n,1),t.ellipsoid(11,3,8,2.4,2,2.2,n),t.set(10,3,10,1446414),t.set(12,3,10,1446414),q([[t,.0625,8,0,7]])}function ds(e=4){let t=new W(18,16,10),n=(t,n,r)=>K(4672340,t,n,r,e,.07);return t.box(5,0,2,13,3,8,n),t.box(6,3,3,12,7,7,n),t.box(3,7,2,15,10,8,(t,r,i)=>r===9?K(9607332,t,r,i,e,.05):n(t,r,i)),t.box(0,8,3,3,10,7,n),t.box(1,9,4,3,10,6,n),t.box(6,10,4,13,11,6,16742954,!0),t.box(13,10,4,15,11,6,16757575,!0),q([[t,.0625,9,0,5]])}var J=(e,t,n,r,i=0,a=.07)=>U(e,a,l(t,n,r,i));function fs(e,t,n,r,i,a,o,s,c,u=.3){for(let d=Math.floor(r-o-1);d<=Math.ceil(r+o+1);d++)for(let f=Math.floor(n-a-1);f<=Math.ceil(n+a+1);f++)for(let p=Math.floor(t-i-1);p<=Math.ceil(t+i+1);p++){let m=(p+.5-t)/i,h=(f+.5-n)/a,g=(d+.5-r)/o,_=m*m+h*h+g*g;if(_<=1+(l(p,f,d,c)-.5)*u){let t=typeof s==`function`?s(p,f,d,_):s;t!=null&&e.set(p,f,d,t)}}}var ps={coal:{vein:2763314,hi:5921382,lo:1315864,patina:3816004,spark:10132138},...Object.fromEntries(Ue.filter(e=>e.oreLook).map(e=>[e.id,e.oreLook]))},ms=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];function hs(e,t=1,n=!1){let r=ps[e]||ps.iron,i=new W(24,20,24),a=(e,n,r,i)=>{let a=l(e>>1,n>>1,r>>1,t),o=v(7304317,9343900,a);return n<3&&(o=v(o,5591631,.5)),i>.78&&n>6&&(o=m(o,1.1)),J(o,e,n,r,t,.07)},o=(e,n,r)=>J(v(6446940,8025972,l(e>>1,n>>1,r>>1,t+3)),e,n,r,t,.06),s=n?o:a,c=n?5.2:7.4;fs(i,12,c*.58,12,8.4,c,7.8,s,t,.34),fs(i,7.6,c*.4,10.2,4.8,c*.62,4.6,s,t+1,.3),fs(i,16.4,c*.44,13.6,4.4,c*.66,4.2,s,t+2,.3),fs(i,11.5,c*.35,17.2,4.2,c*.5,3.4,s,t+3,.3),n||fs(i,11.6,c*1.2,11,4.6,c*.55,4.2,s,t+4,.32);let u=[];for(let e=0;e<i.sz;e++)for(let t=0;t<i.sy;t++)for(let n=0;n<i.sx;n++)!i.has(n,t,e)||t<2||ms.some(([r,a,o])=>!i.has(n+r,t+a,e+o))&&u.push([n,t,e]);if(n){for(let[e,n,r]of u)l(e,n,r,t+21)>.93&&i.set(e,n,r,m(o(e,n,r),.55));for(let e=0;e<4;e++){let n=e*1.7+t;fs(i,12+Math.cos(n)*10,1,12+Math.sin(n)*9,1.6,1.2,1.5,(n,r,i)=>J(7039077,n,r,i,t+e,.08),t+30+e,.2)}return q([[i,.08,12,0,12]])}let d=Math.min(9,6+t%3),f=[];for(let e=0;e<d;e++){let n=null;for(let r=0;r<30;r++){let i=u[Math.floor(l(e,r,t,77)*u.length)];if(i&&!(i[1]<5)&&!f.some(e=>Math.hypot(e[0]-i[0],e[1]-i[1],e[2]-i[2])<4.5)){n=i;break}}if(!n)continue;f.push(n);let[a,o,s]=n;for(let n=-1;n<=1;n++)for(let c=-1;c<=1;c++)for(let u=-1;u<=1;u++){let d=a+u,f=o+c,p=s+n,m=Math.abs(u)+Math.abs(c)+Math.abs(n);if(!(m>2||m===2&&l(d,f,p,t+40)>.6)){if(i.has(d,f,p)){let n=c>0?r.hi:c<0?r.lo:r.vein;i.set(d,f,p,J(n,d,f,p,t+e,.06))}else m<=1&&i.set(d,f,p,J(c>=0?r.hi:r.vein,d,f,p,t+e+9,.05))}}i.set(a,o+1,s,r.spark,!0);for(let[n,c,u]of ms)i.has(a+n*2,o+c*2,s+u*2)&&l(n,c,u,t+e)>.5&&i.set(a+n*2,o+c*2,s+u*2,J(r.patina,a,o,s,5,.1))}return q([[i,.08,12,0,12]])}function gs(e=5){let t=new W(34,22,22),n=(t,n,r)=>J(n%4==0?8014888:9723958,t,n,r,e,.08),r=(t,n,r)=>J(3882566,t,n,r,e+1,.06);for(let e of[6,15])for(let n=0;n<34;n++)t.set(n,1,e,r(n,1,e));for(let n=0;n<34;n+=4)t.box(n,0,4,n+1,1,18,J(5913120,n,0,0,e+7,.1));t.box(5,4,5,29,12,17,(e,t,i)=>e>6&&e<28&&i>6&&i<16&&t>4?null:t===4||t===11||e===5||e===28?r(e,t,i):n(e,t,i)),t.box(6,4,6,28,5,16,n);for(let[e,n]of[[8,3],[26,3],[8,18],[26,18]])for(let i=1;i<6;i++)for(let a=e-2;a<=e+2;a++){let o=a-e,s=i-3;o*o+s*s>6||(t.set(a,i,n,o===0&&s===0?12106950:r(a,i,n)),t.set(a,i,n+(n<10?1:-1),r(a,i,n)))}for(let n=7;n<28;n++)for(let r=7;r<16;r++){let i=(n-17.5)/11,a=(r-11)/5,o=Math.round(5+(1-i*i-a*a*.8)*5+(l(n,r,0,e)-.5)*2.4);for(let i=5;i<5+Math.max(0,o-4);i++){let a=l(n,i,r,e+3),o=l(n>>1,r>>1,0,e+4)>.5,s=a>.55?o?ps.copper.vein:ps.iron.vein:a>.25?8225419:6251629;t.set(n,i+4,r,J(s,n,i,r,e+5,.1),a>.97)}}return t.box(2,6,9,5,7,12,r(0,0,0)),q([[t,.0625,17,0,11]])}function _s(e=3){let t=new W(10,34,46),n=(t,n,r)=>J(n%6==0?5912605:7686182,t,n,r,e,.08),r=(t,n,r)=>J(6963750,t,n,r,e+1,.08);for(let r of[3,38])t.box(2,0,r,7,28,r+5,n),t.box(1,0,r-1,8,3,r+6,(t,n,r)=>J(4862496,t,n,r,e+2,.08));t.box(1,27,1,8,31,45,r),t.box(2,31,6,7,33,40,(t,n,r)=>J(8015404,t,n,r,e+3,.08));for(let e=0;e<7;e++)t.set(3,26-e,8+e,r(3,26-e,8+e)),t.set(4,26-e,8+e,r(4,26-e,8+e)),t.set(5,26-e,8+e,r(5,26-e,8+e)),t.set(3,26-e,37-e,r(3,26-e,37-e)),t.set(4,26-e,37-e,r(4,26-e,37-e)),t.set(5,26-e,37-e,r(5,26-e,37-e));return t.box(4,20,22,6,27,24,3093048),t.box(3,15,21,7,20,25,(e,t,n)=>t===15||t===19?16765562:16757575,1),t.box(4,20,22,6,21,24,3093048),q([[t,.0625,5,0,23]])}function vs(e=7){let t=new W(22,12,18);return fs(t,11,3,9,8,4.4,6.2,(t,n,r)=>{let i=l(t,n,r,e),a=l(t>>2,r>>2,0,e+1)>.5;return J(i>.6?a?ps.copper.vein:ps.iron.vein:i>.3?8225419:6251629,t,n,r,e,.1)},e,.5),q([[t,.0625,11,0,9]])}function ys({length:e=11.1,width:t=2.4,baseY:n=-1.5,deckY:r=1,size:i=.125}={}){let a=Math.round(e/i)+4,o=Math.round(t/i)+6,s=Math.round((r-n)/i),c=s+22,u=new W(a,c,o),d=a-2,f=o-3,p=(e,t,n,r)=>{let i=Math.floor((e-2)/4),a=[10120255,9068085,10843978,8344880][l(i,0,1,9)*4|0];return J(a,e,t,n+i*3,r,.07)};for(let e of[5,Math.floor((3+f)/2),f-3])u.box(2,s-5,e,d,s-2,e+2,(e,t,n)=>J(5190176,e,t,n,3,.1));for(let e=2;e<d;e++)if((e-2)%4!=3){for(let t=3;t<f;t++)u.set(e,s-2,t,p(e,s-2,t,4)),u.set(e,s-1,t,p(e,s-1,t,5)),l(e,t,0,12)>.985&&u.set(e,s-1,t,4861722);(e-2)%4==1&&(u.set(e,s-1,4,3483162),u.set(e,s-1,f-2,3483162))}let m=(e,t,n)=>{u.box(e,0,t,e+3,n,t+3,(e,t,n)=>J(t%7==0?4074008:6176034,e,t,n,6,.09)),u.box(e-1,n,t-1,e+4,n+1,t+4,8015404);for(let r=0;r<Math.min(n,s-6);r++)r%5==0&&u.box(e,r,t,e+3,r+1,t+3,2502687)},h=s+9,g=[];for(let e=3;e<d-2;e+=22)g.push(e);g.push(d-5);for(let e of g)m(e,1,h),m(e,f-1,h);for(let e of[2,f])for(let t=0;t<g.length-1;t++){let n=g[t]+3,r=g[t+1];for(let t=n;t<r;t++){let i=(t-n)/(r-n),a=Math.round(Math.sin(i*Math.PI)*3);u.set(t,h-3-a,e,J(14074772,t,0,0,14,.06)),u.set(t,h-4-a,e,J(11902830,t,0,0,15,.06))}}let _=g[0];for(let e of[1,f-1])u.box(_,h+1,e+1,_+1,h+4,e+2,3093048),u.box(_-1,h+4,e,_+2,h+8,e+3,(e,t,n)=>t===h+4||t===h+7?3093048:16762726,1),u.box(_-1,h+8,e,_+2,h+9,e+3,3093048);let v=d-12;for(let e=0;e<7;e++)for(let t=-3;t<=3;t++)for(let n=-3;n<=3;n++){let r=Math.hypot(t,n);r>3.2-e*.1||r<2.2-e*.1&&e>0&&e<6||u.set(v+t,s+e,6+n,J(e===2||e===5?4869720:7031340,t,e,n,17,.07))}for(let e=-3;e<=3;e++)for(let t=-3;t<=3;t++)Math.hypot(e,t)<2.6&&u.set(v+e,s+5,6+t,J(5220568,e,0,t,18,.1));for(let e=0;e<3;e++)u.box(v+4+e*4,s,3,v+7+e*4,s+4,7,(t,n,r)=>J(n%2?12094034:11041350,t,n,r,20+e,.08));for(let e=0;e<40;e++){let t=e*.4,n=2.6+e*.05;u.set(Math.round(v-10+Math.cos(t)*n),s+(e>>4),Math.round(f-6+Math.sin(t)*n),J(13219203,e,0,0,22,.06))}return q([[u,i,Math.floor(a/2),0,Math.floor(o/2)]])}function bs(e){let t=ps[e]||ps.iron,n=new W(16,14,16),r={copper:4,iron:14,coal:19,mithril:24,adamite:29,titanium:34,platinum:39}[e]||9;fs(n,8,5,8,6,4.4,5.6,(e,t,n)=>J(v(7304317,9343900,l(e>>1,t>>1,n>>1,r)),e,t,n,r,.07),r,.4),fs(n,5,3,9,3.6,3,3.4,(e,t,n)=>J(v(6449008,8422798,l(e>>1,t>>1,n>>1,r+1)),e,t,n,r+1,.07),r+1,.4);for(let[e,i,a]of[[8,9,7],[11,6,9],[5,7,5],[9,5,12],[4,4,9]])for(let o=-1;o<=1;o++)for(let s=-1;s<=1;s++)for(let c=-1;c<=1;c++)Math.abs(c)+Math.abs(s)+Math.abs(o)>2||n.has(e+c,i+s,a+o)&&n.set(e+c,i+s,a+o,J(s>0?t.hi:s<0?t.lo:t.vein,e+c,i+s,a+o,r,.06));return n.set(8,10,7,t.spark,!0),[n,.06,8,0,8]}function xs(){let e=new W(24,20,10);for(let t=0;t<=26;t++){let n=t/26,r=-.35+n*3,i=11+Math.cos(r)*6.6,a=9+Math.sin(r)*6.2,o=2.9-n*1.5;for(let t=0;t<10;t++)for(let r=Math.floor(a-o-1);r<=Math.ceil(a+o+1);r++)for(let s=Math.floor(i-o-1);s<=Math.ceil(i+o+1);s++){let c=t+.5-5;if(Math.hypot(s+.5-i,r+.5-a,c*1.15)>o)continue;let l=Math.floor(n*9)%2==0?16756890:15237226;r+.5<a-o*.35&&n>.2&&(l=16767432),n>.9&&(l=16747098),e.set(s,r,t,J(l,s,r,t,31,.05))}}let t=11+Math.cos(-.35)*6.6,n=9+Math.sin(-.35)*6.2;for(let r of[-1,1]){e.set(Math.round(t+2),Math.round(n+1),5+r*2,1380879),e.set(Math.round(t+2),Math.round(n+2),5+r*2,16777215);for(let i=0;i<9;i++)e.set(Math.round(t+3+i*.9),Math.round(n+2+i*.45),5+r*3,J(15237226,i,0,r,33,.05))}let r=11+Math.cos(2.65)*6.6,i=9+Math.sin(2.65)*6.2;for(let t of[-3,-2,2,3])for(let n=0;n<3;n++)e.set(Math.round(r-1-n*.5),Math.round(i-1-n),5+t,16742986);for(let t=0;t<6;t++)e.set(Math.round(12+Math.cos(.4+t*.45)*5.4),Math.round(9+Math.sin(.4+t*.45)*5.2-2.4),3,J(15777960,t,0,0,34,.05));return[e,.06,12,4,5]}function Ss(){let e=new W(40,16,10);for(let t=0;t<26;t++){let n=t/25,r=5.6*Math.sin(Math.PI*n**.8)**.7+.6,i=r*.55;for(let n=0;n<16;n++)for(let a=0;a<10;a++){let o=n+.5-8,s=a+.5-5;if((o/r)**2+(s/i)**2>1)continue;let c=o/r,u=c>.45?7307844:c>.12?9676408:c>-.15?14262440:c>-.5?12832978:15657170;c>.12&&l(t,n,a,40)>.88&&(u=2959906),t>22&&(u=m(u,.88)),e.set(t+6,n,a,J(u,t,n,a,41,.04))}}for(let t=0;t<8;t++)for(let n=3;n<7;n++)e.set(15+t,13+Math.round(2-Math.abs(t-3.5)*.7),n,J(8223306,t,0,n,42,.05));for(let t=0;t<7;t++)for(let n=4;n<6;n++)e.set(18+t,3-Math.round(1.5-Math.abs(t-3)*.4),n,J(11903850,t,1,n,43,.05));Es(e,32,8,[4,5],6,6,6,9207108,44);for(let t of[1.2,8.2])e.set(9,9,t|0,16777215),e.set(9,10,t|0,1380879),e.set(10,10,t|0,1380879);for(let t of[3,6])for(let n=0;n<4;n++)e.set(13+n,6-Math.floor(n*.4),t,J(13219962,n,2,t,46,.05));return[e,.06,18,8,5]}function Cs(e){let t=e.rh*2+8,n=e.sz||10,r=new W(e.L+(e.tailLen||8)+14,t,n),i=Math.floor(t/2),a=n/2;for(let o=0;o<e.L;o++){let s=o/(e.L-1),c=e.prof(s),l=Math.max(.8,c*e.wide);for(let u=0;u<t;u++)for(let t=0;t<n;t++){let n=u+.5-i,d=t+.5-a;if((n/c)**2+(d/l)**2>1)continue;let f=e.paint(n/c,s,o,u,t,d/l);r.set(o+6,u,t,J(f,o,u,t,e.seed,.04))}}return{M:r,x0:6,cy:i,cz:a,sz:n}}function ws(e,t,n,r=1380879,i=16777215){for(let a of[-1,1])for(let o=a<0?0:e.sz-1;o>=0&&o<e.sz;o-=a)if(e.has(t,n,o)){e.set(t,n,o,i),e.set(t+1,n,o,r);break}}function Ts(e,t,n,r,i,a,o,s,c=.6){for(let l=0;l<r;l++)for(let u of s)e.set(t+l,n+a*(1+Math.round(Math.sin(l/(r-1)*Math.PI)*r*c)),u,J(i,l,n,u,o,.05))}function Es(e,t,n,r,i,a,o,s,c){for(let l=0;l<i;l++){let u=(l+1)/i,d=Math.max(1,Math.round(1+(a-1)*u)),f=Math.max(1,Math.round(1+(o-1)*u)),p=l>i*.45?Math.round((l-i*.45)/(i*.55)*Math.min(a,o)*.7):0;for(let i=p;i<d;i++)for(let a of r)e.set(t+l,n+i,a,J(s,l,i,a,c,.06));for(let i=p;i<f;i++)for(let a of r)e.set(t+l,n-1-i,a,J(m(s,.92),l,i,a,c+1,.06))}}function Ds(){let{M:e,x0:t,cy:n,cz:r}=Cs({L:24,rh:4,wide:.6,seed:51,prof:e=>3.5*Math.sin(Math.PI*e**.85)**.62+.7,paint:(e,t,n,r,i)=>e>.4?t>.7&&l(n,r,i,52)>.8?3815966:7039538:e>.05?t>.55&&e<.28?4868648:11842170:e>-.4?14210214:15920856});for(let r=0;r<8;r++)for(let i of[4,5])e.set(t+14+r,n+3+Math.round(1.6-Math.abs(r-3.5)*.5),i,J(9077828,r,0,i,53,.05));Ts(e,t+14,n-2,6,13482106,-1,54,[4,5],.3);for(let r of[2,7])for(let i=0;i<3;i++)e.set(t+8+i,n-1-Math.floor(i*.4),r,14207114);for(let r=3;r<=6;r++)e.set(t,n-1,r,2760728);return Es(e,t+24,n,[4,5],6,5,5,11838560,55),ws(e,t+3,n+1),[e,.06,16,n,r]}function Os(){let{M:e,x0:t,cy:n,cz:r}=Cs({L:31,rh:6,wide:.55,seed:61,prof:e=>5.4*Math.sin(Math.PI*e**.78)**.66+.7,paint:(e,t,n,r,i)=>e>.5?l(n,r,i,62)>.86?1713192:3955306:e>.1?l(n,r,i,63)>.9&&t>.2?2042416:9086128:e>-.12?t>.25&&t<.85?14981792:13293788:e>-.5?14082788:16183524});for(let r=0;r<8;r++)for(let i of[4,5])e.set(t+12+r,n+5+Math.round(2.2-Math.abs(r-3.5)*.6),i,J(4875892,r,0,i,64,.05));for(let r of[4,5])for(let i=0;i<2;i++)e.set(t+31-8+i,n+4,r,3559002);Ts(e,t+14,n-5,6,14262432,-1,65,[4,5],.3);for(let r of[2,7])for(let i=0;i<5;i++)e.set(t+7+i,n-2-Math.floor(i*.5),r,J(14987440,i,2,r,66,.05));return e.set(t-1,n-1,4,13621724),e.set(t-1,n-1,5,13621724),e.set(t,n-3,4,2759196),e.set(t,n-3,5,2759196),e.set(t+1,n-4,4,2759196),e.set(t+1,n-4,5,2759196),Es(e,t+31,n,[4,5],8,7,7,4480620,67),ws(e,t+4,n+1),[e,.06,20,n,r]}function ks(){let{M:e,x0:t,cy:n,cz:r}=Cs({L:40,rh:6,wide:.58,seed:71,prof:e=>4.7*Math.sin(Math.PI*e**.7)**.55+.9,paint:(e,t,n,r,i,a)=>e>.42?4876844:e>-.2?l(n>>1,r,i>>1,72)>.7&&t>.14&&Math.abs(a)>.3?14867612:6982202:e>-.55?12108944:15657164});for(let r=0;r<8;r++)for(let i of[4,5])e.set(t+40-12+r,n+3+Math.round(1.8-Math.abs(r-3.5)*.45),i,J(11888174,r,0,i,73,.05));Ts(e,t+40-12,n-3,7,11888174,-1,74,[4,5],.25);for(let r of[2,7])for(let i=0;i<4;i++)e.set(t+9+i,n-3-Math.floor(i*.4),r,J(13203514,i,3,r,75,.05));for(let r=1;r<=4;r++)for(let i of[4,5])e.set(t-r,n-1,i,J(5929524,r,0,i,76,.05));for(let r=1;r<=3;r++)for(let i of[4,5])e.set(t-r,n-2,i,J(13619872,r,1,i,77,.05));for(let r of[3,6])for(let i=1;i<5;i+=2)e.set(t+i-2,n-2,r,16052448);return Es(e,t+40,n,[4,5],7,6,6,9067050,78),ws(e,t+4,n+2,1380879,15782e3),[e,.055,22,n,r]}function As(){let{M:e,x0:t,cy:n,cz:r}=Cs({L:46,rh:6,wide:.78,sz:12,seed:81,prof:e=>5.1*Math.sin(Math.PI*e**.62)**.6+.8,paint:(e,t,n,r,i,a)=>e>.55?l(n,r,i,82)>.8?4869706:6120026:e>.05?l(n,r,i,83)>.85?8291448:7304296:e>-.4?10921104:14866872});for(let i=4;i<40;i+=3){let a=e.sy;for(let n=a-1;n>=0;n--)if(e.has(t+i,n,6)){e.set(t+i,n+1,6,13946798);break}for(let a of[-1,1]){let o=Math.round(r-.5+a*Math.max(1,3.4*(.4+.6*Math.sin(i/46*Math.PI))));for(let r=n+1;r>=n-3;r--)e.has(t+i,r,o)&&r===n&&e.set(t+i,r,o,13617574)}}for(let r=5;r<38;r+=3)for(let i of[3,8])for(let a=n-3;a<=n+2;a++)e.has(t+r,a,i)&&l(r,a,i,84)>.5&&e.set(t+r,a,i,13946798);for(let r=1;r<=7;r++)for(let i of[5,6])e.set(t-r,n-1-0,i,J(8159346,r,0,i,85,.05));for(let r=1;r<=6;r++)for(let i of[5,6])e.set(t-r,n-2,i,J(13617320,r,1,i,86,.05));for(let r of[4,7])for(let i=0;i<3;i++)e.set(t-1+i,n-3-0,r,9075284);for(let r of[3,8])e.set(t-1,n-3,r,9075284);for(let r=0;r<9;r++)for(let i of[5,6])e.set(t+46-14+r,n+4+Math.round(2-Math.abs(r-4)*.5),i,J(5593682,r,0,i,87,.05));Ts(e,t+46-12,n-4,7,9079416,-1,88,[5,6],.3);for(let r of[2,9])for(let i=0;i<5;i++)e.set(t+11+i,n-3-Math.floor(i*.4),r,J(10132100,i,2,r,89,.05));return Es(e,t+46,n,[5,6],9,11,5,5593682,90),ws(e,t+5,n+1,1380879,15262408),[e,.05,25,n,r]}function js(){let{M:e,x0:t,cy:n,cz:r}=Cs({L:36,rh:7,wide:.6,sz:12,seed:91,tailLen:10,prof:e=>6.2*Math.sin(Math.PI*e**.72)**.62+.7,paint:(e,t,n,r,i)=>e>.5?l(n,r,i,92)>.84?1321034:2047334:e>.12?l(n>>1,r,i,93)>.8?4880552:5999544:e>-.08&&t>.2&&t<.88?15254586:e>-.5?13162206:l(n>>1,r,i,94)>.82?12109004:15265520});for(let r=0;r<6;r++)for(let i of[5,6])e.set(t+11+r,n+6+Math.round(3.2-Math.abs(r-1.5)*1),i,J(15254586,r,0,i,95,.05));for(let r=0;r<10;r++)for(let i of[5,6])e.set(t+36-14+r,n+6+Math.round(3-r*.3),i,J(15782474,r,1,i,96,.05));for(let r=0;r<10;r++)for(let i of[5,6])e.set(t+36-13+r,n-6-Math.round(2.4-r*.2),i,J(15782474,r,2,i,97,.05));for(let r=0;r<5;r++)for(let i of[5,6])e.set(t+36-4+r,n+5-Math.floor(r*.3),i,16111674),e.set(t+36-4+r,n-5+Math.floor(r*.3),i,16111674);Ts(e,t+12,n-6,7,4876940,-1,98,[5,6],.3);for(let r of[2,9])for(let i=0;i<6;i++)e.set(t+9+i,n-3-Math.floor(i*.5),r,J(10466500,i,3,r,99,.05));for(let r of[4,5,6,7])e.set(t,n-1,r,1712688);return Es(e,t+36,n,[5,6],9,9,9,2771564,100),ws(e,t+4,n+1,657930,15263976),[e,.058,20,n,r]}function Ms(){let{M:e,x0:t,cy:n,cz:r}=Cs({L:50,rh:8,wide:.72,sz:14,seed:101,tailLen:14,prof:e=>7*Math.sin(Math.PI*e**.7)**.58+.8,paint:(e,t,n,r,i)=>e>.1?(n+Math.floor(e*2))%6<2&&t>.2&&t<.88?3490639:l(n,r,i,102)>.9?5926010:7242642:e>-.35?(n+3)%6<1&&t>.3&&t<.8?6978698:9675952:l(n>>1,r,i,103)>.9?14542054:15791090}),i=[6,7];for(let r=0;r<12;r++){let a=Math.round(9*(1-r/12)**1.3);for(let o=0;o<a;o++)for(let s of i)e.set(t+14+r-Math.floor(o*.5),n+8+o,s,J(o>a-2?2897986:5794424,r,o,s,104,.05))}for(let r=0;r<6;r++)for(let a of i)for(let i=0;i<Math.max(1,4-r);i++)e.set(t+50-12+r,n+7+i,a,J(4873322,r,i,a,105,.05));for(let r of[1,12])for(let i=0;i<11;i++){let a=5-Math.floor(i*.4);for(let o=0;o<a;o++)e.set(t+14+i,n-3-Math.floor(i*.55)-o,r,J(i<4?8163230:6979212,i,o,r,106,.05))}for(let r=0;r<7;r++)for(let i of[6,7])e.set(t+50-20+r,n-6-Math.round(2.4-Math.abs(r-2)*.5),i,J(8031900,r,0,i,107,.05));for(let r of[8,10,12])for(let i=n-3;i<=n+3;i++)for(let n of[1,12])e.has(t+r,i,n)&&e.set(t+r,i,n,2107438);for(let r=0;r<9;r++)for(let i of[4,5,6,7,8,9])!e.has(t+1+r,n-4,i)&&e.has(t+1+r,n-3,i)&&e.set(t+1+r,n-4,i,r%2==0?16185072:8006186);for(let r=4;r<=9;r++)e.set(t+1,n-2,r,1777442);return Es(e,t+50,n,[6,7],13,15,6,4873322,108),ws(e,t+5,n+2,328965,15788208),[e,.05,25,n,r]}function Ns(){let e=new W(52,12,38);for(let t=0;t<38;t++)for(let n=0;n<36;n++){let r=(n+.5-17)/(n<17?13:17),i=(t+.5-19)/18,a=r*r+i*i;if(a>1+(l(n,0,t,111)-.5)*.08)continue;let o=Math.abs(i),s=o>.62?Math.round((o-.62)*5):0,c=3+Math.round(3*(1-a)**.8)+s-+(o>.9);for(let r=1;r<=c;r++){let i;i=r===1?l(n>>1,0,t>>1,112)>.88?14274490:15854814:r<c?12102028:l(n>>1,r,t>>1,113)>.86?14207392:a>.8?6969924:l(n,r,t,114)>.5?9074262:8219212,e.set(n,r,t,J(i,n,r,t,115,.04))}}for(let t of[-1,1]){let n=19+t*3;for(let t=0;t<2;t++)e.set(6,7+t,n,15788232),e.set(7,7+t,n,921102);e.set(11,7,19+t*5,3812898),e.set(11,6,19+t*5,3812898)}for(let t=0;t<16;t++){let n=t/15<.5?2:1,r=Math.floor(t/2)%2==0;for(let i=19-n;i<19+n;i++)e.set(34+t,3-(t>12),i,J(r?3812898:9074262,t,0,i,116,.04));if(n===2)for(let r=19-n;r<19+n;r++)e.set(34+t,2,r,15261900)}for(let t=0;t<6;t++)e.set(41+t,4+ +(t>3),19,2105370);e.set(42,5,19,2105370);for(let t=17;t<21;t++)e.set(2,1,t,3810328);return[e,.058,17,3,19]}var Ps={birch:{bark:15986404,barkHi:16775920,cut:16181184,heart:15190410,ring:2762274},oak:{bark:6964521,barkHi:9067060,cut:14267002,heart:12883285,ring:9067056},maple:{bark:7223332,barkHi:9061936,cut:14856304,heart:12878920,ring:5908504}};function Fs(e,t=1){let n=Ps[e]||Ps.oak,r=new W(16,8,16);for(let i=0;i<5;i++)for(let a=0;a<16;a++)for(let o=0;o<16;o++){let s=Math.hypot(o+.5-8,a+.5-8);if(!(s>(i<2?5.4:4.4))){if(i===4){let e=Math.floor(s);r.set(o,i,a,s<1.2?n.heart:e%2==0?n.cut:m(n.cut,.86))}else e===`birch`&&i===3?r.set(o,i,a,2762274):r.set(o,i,a,J(m(n.bark,l(o,0,a,t)>.6?.86:1),o,i,a,t,.08))}}return q([[r,.11,8,0,8]])}function Is(e=`birch`){let t=Ps[e]||Ps.oak,n=new W(20,8,20),r=(e,r,i,a,o)=>{let s=Math.max(Math.abs(i-e),Math.abs(a-r));for(let c=0;c<=s;c++){let l=Math.round(e+(i-e)*c/s),u=Math.round(r+(a-r)*c/s);for(let d=0;d<3;d++)for(let f=-1;f<=1;f++){let p=Math.abs(i-e)>Math.abs(a-r),m=p?l:l+f,h=p?u+f:u,g=c<2||c>s-2;n.set(m,o+d,h,g?d===1?t.cut:t.ring:d===2?t.barkHi:t.bark)}}};r(3,7,16,12,0),r(4,13,15,6,1);let i=new W(20,16,20),a=[16774848,16761418,16738840,16769152];for(let e=3;e<14;e++){let t=e<6?2.4:Math.max(.4,2.5-(e-5)*.28);for(let n=6;n<=13;n++)for(let r=6;r<=13;r++)Math.hypot(r-9.5,n-9.5)>t||l(r,e,n,70)<.25&&e>6||i.set(r,e,n,a[(r+e+n)%a.length],!0)}return{logs:q([[n,.07,10,0,10]]),flame:q([[i,.07,10,0,10]])}}function Ls(e){let t=Ps[e],n=e===`birch`?11:e===`maple`?13:12,r=new W(24,16,16),i=(i,a)=>{for(let o=2;o<22;o++)for(let s=0;s<5;s++)for(let c=0;c<5;c++){let l=s-2,u=c-2;if(l*l+u*u>5.3)continue;let d=o<4||o>19,f=Math.hypot(l,u),p=d?f<1.15?t.heart:f<2?t.cut:t.ring:s===4?t.barkHi:t.bark;!d&&e===`birch`&&s===1&&c===2&&o%4==0&&(p=2762274),r.set(o,i+s,a+c,J(p,o,s,c,n,.06))}};return i(0,5),i(3,1),i(3,8),[r,.045,12,0,8]}function Rs(e,t){let[n,r,i,a,o]=zs[e](),s=n.data;for(let e=0;e<s.length;e++){let r=s[e];if(!r)continue;let i=r>>16&255,a=r>>8&255,o=r&255,c=i*.3+a*.5+o*.2,u,d,f;if(t===`cooked`)u=Math.min(255,Math.round(c*1.05+68)),d=Math.min(255,Math.round(c*.55+28)),f=Math.min(255,Math.round(c*.16+8));else{let t=Math.floor(e/(n.sx*n.sy)),r=e-t*n.sx*n.sy,i=Math.floor(r/n.sx),a=r-i*n.sx,o=l(a,i,t,91);if(o>.9)u=22,d=16,f=12;else if(o>.84&&c>120)u=168,d=64,f=22;else{let e=58+c*.22;u=Math.round(e+16),d=Math.round(e*.72+10),f=Math.round(e*.48+6)}}s[e]=r&-16777216|u<<16|d<<8|f}return[n,r,i,a,o]}var zs={...Object.fromEntries(Ue.filter(e=>e.ore).map(e=>[e.oreId,()=>bs(e.id)])),coal:()=>bs(`coal`),shrimp:xs,trout:Ss,pikeminnow:Ds,salmon:Os,pike:ks,sturgeon:As,tuna:js,stingray:Ns,tigershark:Ms,cooked_shrimp:()=>Rs(`shrimp`,`cooked`),cooked_trout:()=>Rs(`trout`,`cooked`),cooked_pikeminnow:()=>Rs(`pikeminnow`,`cooked`),cooked_salmon:()=>Rs(`salmon`,`cooked`),cooked_pike:()=>Rs(`pike`,`cooked`),cooked_sturgeon:()=>Rs(`sturgeon`,`cooked`),cooked_tuna:()=>Rs(`tuna`,`cooked`),cooked_stingray:()=>Rs(`stingray`,`cooked`),cooked_tigershark:()=>Rs(`tigershark`,`cooked`),burnt_shrimp:()=>Rs(`shrimp`,`burnt`),burnt_trout:()=>Rs(`trout`,`burnt`),burnt_pikeminnow:()=>Rs(`pikeminnow`,`burnt`),burnt_salmon:()=>Rs(`salmon`,`burnt`),burnt_pike:()=>Rs(`pike`,`burnt`),burnt_sturgeon:()=>Rs(`sturgeon`,`burnt`),burnt_tuna:()=>Rs(`tuna`,`burnt`),burnt_stingray:()=>Rs(`stingray`,`burnt`),burnt_tigershark:()=>Rs(`tigershark`,`burnt`),burnt_fish:()=>Rs(`trout`,`burnt`),birch_logs:()=>Ls(`birch`),oak_logs:()=>Ls(`oak`),maple_logs:()=>Ls(`maple`),...Object.fromEntries(Ue.map(e=>[e.barId,()=>Vs(e.theme.plateHi,e.theme.plateLo)])),arrowhead:Hs,feather:Ws,birch_shaft:()=>Us(`birch`),oak_shaft:()=>Us(`oak`),maple_shaft:()=>Us(`maple`),arrow_shaft:()=>Us(`birch`),iron_arrow:Gs,quiver:Ks,__debug_pouch:Bs};function Bs(){let e=new W(16,16,14);return e.box(3,1,3,13,10,11,(e,t,n)=>J(t>8?13936714:9062940,e,t,n,9,.05)),e.box(5,10,5,11,13,9,5910544),e.box(7,12,6,9,15,8,16765503),[e,.055,8,0,7]}function Vs(e,t){let n=new W(22,8,8);return n.box(1,2,2,20,6,6,(n,r,i)=>J(r===5?e:r===2?t:v(e,t,.45),n,r,i,4,.05)),n.box(1,3,3,20,5,5,v(e,t,.35)),[n,.05,11,0,4]}function Hs(){let e=new W(14,8,8);for(let t=2;t<=11;t++){let n=t<8?1:Math.max(0,11-t);for(let r=3-n;r<=4+n;r++)e.set(t,r,4,J(12042440,t,r,4,5,.04))}return e.box(1,3,3,3,5,5,6964008),[e,.06,7,0,4]}function Us(e=`birch`){let t=Ps[e]||Ps.birch,n=new W(22,6,6);return n.box(1,2,2,18,4,4,(e,n,r)=>J(t.heart,e,n,r,6,.05)),n.box(16,1,2,20,5,4,t.bark),[n,.05,11,0,3]}function Ws(){let e=new W(18,10,6);e.box(1,4,2,5,6,4,15192740);for(let t=4;t<=16;t++){let n=Math.max(0,4-Math.floor((t-4)/3));e.box(t,5-n,2,t,5+n,3,t%2?16775920:14999764)}return e.set(17,5,2,16775920),[e,.055,9,0,3]}function Gs(){let e=new W(26,8,8);e.box(4,3,3,20,5,5,(e,t,n)=>J(13214570,e,t,n,7,.04));for(let t=18;t<=24;t++){let n=Math.max(0,24-t);for(let r=4-n;r<=4+n;r++)e.set(t,r,4,14147302)}return e.box(2,2,3,5,6,5,16052196),e.set(1,4,4,14830114),[e,.045,13,0,4]}function Ks(){let e=new W(16,22,12);e.box(4,1,3,12,18,9,(e,t,n)=>J(t%3==0?9067058:6964008,e,t,n,8,.05)),e.box(5,16,4,11,20,8,16052196);for(let t=0;t<4;t++)e.box(6+t,18,5,6+t,21,6,14147302);return e.box(3,8,4,4,12,8,10134443),e.box(12,8,4,13,12,8,10134443),[e,.045,8,0,6]}function qs(e){return(zs[e]||zs.__debug_pouch)()}var Js=Math.PI*2,Y=(e=0,t=1)=>e+Math.random()*(t-e),Ys=new jt,Xs=[16774336,16765530,16747038,16730650],Zs=[16777215,14152959,9426175],Qs=[16777215,14286847,4903167],$s=[15780095,11689215,6958280],ec=[14155696,9429850,4892730],tc={fireball:{core:16774336,c1:16747038,size:2.5,trail:[16738842,.55,.38],sparks:Xs,rate:60,smoke:!0,light:16747050,coreSize:.34},frostbolt:{core:16777215,c1:8376575,size:2.1,trail:[10476799,.4,.35],sparks:Zs,rate:50,light:9426175,coreSize:.3,shard:!0},spark:{core:16777215,c1:4903167,size:1.7,trail:[9430271,.26,.2],sparks:Qs,rate:70,coreSize:.22,zap:!0},bolt:{core:16777215,c1:4903167,size:1.9,trail:[7330047,.3,.26],sparks:Qs,rate:55,coreSize:.26,zap:!0},ember:{core:16774336,c1:16747038,size:2.2,trail:[16738842,.45,.32],sparks:Xs,rate:50,smoke:!0,coreSize:.3},frost:{core:16777215,c1:8376575,size:1.9,trail:[10476799,.34,.3],sparks:Zs,rate:40,coreSize:.26},icicle:{c1:10476799,size:1.5,trail:[12577535,.22,.28],sparks:Zs,rate:34,arrow:{tip:15137279,fletch:9426175,thick:1.15}},iceboulder:{core:15137279,c1:8376575,size:3.2,trail:[10476799,.7,.4],sparks:Zs,rate:70,coreSize:.78,shard:!0},icebreath:{core:16777215,c1:11461887,size:2.6,trail:[13496063,.5,.26],sparks:Zs,rate:60,coreSize:.34},lavabolt:{core:16773312,c1:16734738,size:2.8,trail:[16738842,.7,.32],sparks:Xs,rate:70,smoke:!0,smokeCol:3810328,light:16738834,coreSize:.42},orb:{core:15980287,c1:11554303,size:2.1,trail:[11554303,.36,.3],sparks:$s,rate:45,coreSize:.28},gloom:{core:15780095,c1:8008928,size:2.7,trail:[6958280,.5,.45],sparks:$s,rate:55,smoke:!0,smokeCol:2759748,coreSize:.32,homing:!0},crescent:{core:15328511,c1:11689215,size:2.2,trail:[11689215,.6,.3],sparks:$s,rate:50,coreSize:0},poisonvolley:{c1:7196234,size:1,trail:[8380506,.14,.3],sparks:ec,rate:22,arrow:{tip:8380506,fletch:4892730}},plaguearrow:{c1:9063120,size:1.7,trail:[8010440,.28,.5],sparks:[14155696,10115808,7196234],rate:48,smoke:!0,smokeCol:2902570,arrow:{tip:12124026,fletch:9063120,thick:1.5}},aimedshot:{c1:16765503,size:1.5,trail:[16765503,.2,.28],sparks:[16777215,16765503],rate:28,arrow:{tip:16773296,fletch:16765503,thick:1.2}},snipe:{c1:9430271,size:1.8,trail:[11463167,.26,.5],sparks:[16777215,9430271],rate:36,arrow:{tip:16777215,fletch:9430271,thick:1.3}},arrow:{c1:16773840,size:0,trail:[16773840,.09,.14],rate:0,arrow:{tip:14673646,fletch:15921126}},stone:{c1:14272928,size:0,trail:[14272928,.12,.2],rate:0}};function nc(e){return tc[e.skill]||tc[e.kind]||tc.arrow}function rc(e){let t=tc[e.skill]||tc[e.kind]||tc.arrow,n=new V,r=e.kind;if(t.arrow){let e=t.arrow,r=e.thick||1,i=new yt(new ye(.05*r,.05*r,.62),new a({color:13146716})),o=new yt(new ye(.1*r,.1*r,.15),new a({color:e.tip}));o.position.z=.37;let s=new yt(new ye(.05*r,.05*r,.08),new a({color:e.tip}));s.position.z=.45,n.add(i,o,s);for(let t=0;t<2;t++){let i=new yt(new ye(.16*r,.015,.16),new a({color:e.fletch}));i.position.z=-.27,i.rotation.z=t*Math.PI*.5,n.add(i)}return n}if(r===`stone`)return n.add(new yt(new ye(.22,.22,.22),new a({color:11119026}))),n;if(r===`crescent`){let e=new a({color:15986431}),t=new a({color:11689215});for(let r=0;r<9;r++){let i=-1.2+r*.3,a=.3-Math.abs(r-4)*.045,o=new yt(new ye(a,.07,.16),e);o.position.set(Math.sin(i)*.55,0,Math.cos(i)*.55-.4),o.rotation.y=i;let s=new yt(new ye(a*.8,.05,.1),t);s.position.set(Math.sin(i)*.66,0,Math.cos(i)*.66-.4),s.rotation.y=i,n.add(o,s)}return n}let i=t.coreSize||.28,o=new yt(new ye(i,i,i),new a({color:t.core})),s=new yt(new ye(i*.8,i*.8,i*.8),new a({color:t.c1}));if(s.rotation.set(.78,.78,0),s.scale.setScalar(1.35),n.add(s,o),t.shard)for(let e=0;e<4;e++){let t=new yt(new ye(.07,.07,.3),new a({color:14152959})),r=e/4*Js;t.position.set(Math.cos(r)*.2,Math.sin(r)*.2,0),t.rotation.z=r,n.add(t)}return n}function ic(e,t){let n=nc(t);if(t.fxStyle=n,n.trail){let[r,i,a]=n.trail;t.trail=e.vfx.trail(r,{width:i,life:a,pts:24,white:n.arrow?.5:.7,step:.05})}}function ac(e,t,n){let r=t.fxStyle;if(!r)return;let i=e.vfx,a=t.mesh.position;if(t.trail&&t.trail.add(a.x,a.y,a.z),r.size){let e=1+Math.sin(t.age*30)*.08;i.glowNow(a.x,a.y,a.z,r.c1,r.size*e,.85),(r.coreSize||r.arrow)&&i.glowNow(a.x,a.y,a.z,16777215,r.size*.38*e,.7)}if(r.rate&&Math.random()<n*r.rate*i.density){let e=r.sparks,n=e[Math.random()*e.length|0];i.spark(a.x+Y(-.12,.12),a.y+Y(-.12,.12),a.z+Y(-.12,.12),-t.vx*.06+Y(-.8,.8),Y(-.4,1.2),-t.vz*.06+Y(-.8,.8),n,Y(.04,.09),Y(.25,.5),r.zap?0:3,1.5)}if(r.smoke&&Math.random()<n*22*i.density&&e.fx.emit(a.x,a.y,a.z,Y(-.3,.3),Y(.4,1),Y(-.3,.3),r.smokeCol||4866112,Y(.12,.2),Y(.4,.7),-.8),r.zap&&Math.random()<n*14*i.density){let e=Y(0,Js),t=Y(.3,.7);i.bolt({x:a.x,y:a.y,z:a.z},{x:a.x+Math.cos(e)*t,y:a.y+Y(-.4,.4),z:a.z+Math.sin(e)*t},{seg:3,width:.07,jag:.15,life:.1,branches:0,color:11922687})}r.light&&t.skill&&i.flash(a.x,a.y,a.z,r.light,2.2,.12)}function oc(e,t,n){let r=t.fxStyle;if(t.trail?.end(),!r)return;let i=t.mesh.position,a=e.vfx,{x:o,y:s,z:c}=i,l=t.skill||t.kind;if(!t.splash)switch(l){case`frostbolt`:case`frost`:case`icicle`:case`icebreath`:sc(e,o,s,c,l===`icebreath`?.7:1);break;case`iceboulder`:sc(e,o,s,c,2.1);break;case`spark`:case`bolt`:cc(e,o,s,c,l===`spark`?.8:1.1);break;case`orb`:lc(e,o,s,c,.8,11554303);break;case`gloom`:case`crescent`:lc(e,o,s,c,1.1,9059040);break;case`plaguearrow`:uc(e,o,s,c,1.3);break;case`poisonvolley`:uc(e,o,s,c,.6);break;case`snipe`:a.ring(o,s,c,{axis:`cam`,color:11463167,r0:.1,r1:1,life:.22,thick:.2}),a.sparks(o,s,c,[16777215,11463167],8,6,.06,.3,6);break;case`aimedshot`:a.ring(o,s,c,{axis:`cam`,color:16765503,r0:.1,r1:.8,life:.2,thick:.2}),a.sparks(o,s,c,[16777215,16765503],6,5,.06,.3,6);break;case`stone`:e.fx.dust(o,s,c,4,1,12103840);break;case`lavabolt`:a.glow(o,s,c,16769162,1.3,.14,{grow:.5}),a.glow(o,s,c,16734738,2.1,.28,{grow:.45,gain:.65}),a.sparks(o,s,c,Xs,10,5,.08,.4,5),a.ring(o,s,c,{axis:`cam`,color:16747044,r0:.1,r1:.9,life:.22,thick:.14}),n&&a.scorch(o,c,.85,1313800,.4,3);break;default:n&&a.sparks(o,Math.max(s,0),c,[16773840,14272928],3,2,.05,.25,8)}}function sc(e,t,n,r,i=1){let a=e.vfx;a.glow(t,n,r,16777215,1.6*i,.14,{grow:.6}),a.glow(t,n,r,8376575,2.8*i,.3,{grow:.8}),a.ring(t,n,r,{axis:`cam`,color:12577535,r0:.1,r1:1.2*i,life:.28,thick:.18}),a.sparks(t,n,r,Zs,14*i,5.5,.07,.55,9);for(let e=0;e<a.n(5);e++){let i=e/5*Js+Y(0,.5);a.spark(t,n,r,Math.cos(i)*3.4,Y(1.5,4),Math.sin(i)*3.4,15268863,.14,.6,12,.8)}a.flash(t,n,r,9426175,2.4,.2)}function cc(e,t,n,r,i=1){let a=e.vfx;a.glow(t,n,r,16777215,1.4*i,.1,{grow:.5}),a.glow(t,n,r,4903167,2.6*i,.22,{grow:.8}),a.ring(t,n,r,{axis:`cam`,color:10479871,r0:.1,r1:1*i,life:.2,thick:.2,fill:.2});for(let e=0;e<3;e++){let e=Y(0,Js),o=Y(.8,1.5)*i;a.bolt({x:t,y:n,z:r},{x:t+Math.cos(e)*o,y:n+Y(-.5,.6),z:r+Math.sin(e)*o},{seg:4,width:.09,jag:.2,life:.16,branches:0,color:11922687})}a.sparks(t,n,r,Qs,10*i,6,.06,.35,5),a.flash(t,n,r,7330047,2.4,.16)}function lc(e,t,n,r,i,a){let o=e.vfx;o.glow(t,n,r,16777215,1.2*i,.1,{grow:.5}),o.glow(t,n,r,a,2.8*i,.34,{grow:.9}),o.ring(t,n,r,{axis:`cam`,color:a,r0:1.4*i,r1:.1,life:.2,thick:.25,ease:`lin`}),o.ring(t,n,r,{axis:`cam`,color:15255807,r0:.1,r1:1.5*i,life:.3,thick:.14,delay:.1}),o.sparks(t,n,r,$s,12*i,4.5,.07,.6,3);for(let i=0;i<4;i++)e.fx.emit(t,n,r,Y(-1.2,1.2),Y(.5,2),Y(-1.2,1.2),2759748,Y(.14,.24),Y(.5,.8),-1);o.flash(t,n,r,9059040,2,.2)}function uc(e,t,n,r,i=1){let a=e.vfx;for(let e=0;e<a.n(5);e++)a.glow(t+Y(-.4,.4)*i,n+Y(0,.4),r+Y(-.4,.4)*i,e%2?7196234:10115808,Y(1.2,2.2)*i,Y(.5,.9),{grow:.8,vy:Y(.4,1),gain:.7});a.ring(t,n,r,{axis:`cam`,color:9429850,r0:.1,r1:1.1*i,life:.3,thick:.16}),a.sparks(t,n,r,ec,10*i,3,.08,.7,-.5,1,.8)}function dc(e,t,n,r,i){let a=e.vfx,o=e.world.heightAt(t,r);a.glow(t,n,r,16777215,i*1.5,.12,{grow:.6,pow:1.2}),a.glow(t,n,r,16752704,i*2.6,.3,{grow:.7,gain:.7}),a.glow(t,n+.2,r,16730650,i*3.4,.45,{grow:.5,gain:.35}),a.ring(t,o+.12,r,{color:16760896,r0:.3,r1:i*1.5,life:.32,thick:.18,fill:.2}),a.ring(t,o+.14,r,{color:16734746,r0:.2,r1:i*1.9,life:.5,thick:.08,delay:.05}),a.ring(t,n,r,{axis:`cam`,color:16765056,r0:.2,r1:i*1.2,life:.25,thick:.16}),a.sparks(t,n,r,Xs,i/2*26,8,.1,.8,9,1,.4);let s=a.n(6);for(let e=0;e<s;e++){let n=e/s*Js+Y(-.3,.3),c=i*Y(.35,.8);a.prism(t+Math.cos(n)*c,o,r+Math.sin(n)*c,{w:Y(.4,.6),h:Y(1.1,1.9)*(i/2.2),segs:5,color:15223312,core:16756800,delay:e*.025,rise:.12,hold:.12,fall:.38,flicker:!0,tilt:.15})}for(let i=0;i<a.n(8);i++)e.fx.emit(t+Y(-.5,.5),n,r+Y(-.5,.5),Y(-1.6,1.6),Y(1.5,3.2),Y(-1.6,1.6),i%3?4866112:2762278,Y(.16,.3),Y(.7,1.2),-1.2);a.scorch(t,r,i*.95,1182728,.5,5),a.flash(t,n+.5,r,16747050,3,.35)}function fc(e){return Math.atan2(e.x,e.z)}function pc(e){let t=e.model?.heldSlot;return t?(e.obj.updateMatrixWorld(!0),t.getWorldPosition(Ys),{x:Ys.x,y:Ys.y,z:Ys.z}):{x:e.pos.x+e.facing.x*.6,y:e.pos.y+1.2,z:e.pos.z+e.facing.z*.6}}function mc(e,t,n,r,i={}){let a=e.vfx,o=e.vfxAuras=e.vfxAuras||{};o[t]&&(o[t].dead=!0);let s=a.add({update:(s,c)=>{if(c.dead||!r())return o[t]===c&&(o[t]=null),!1;let l=e.player;if(Math.random()<s*(i.rate??26)*a.density){let e=Y(0,Js),t=Y(.3,.7);a.spark(l.pos.x+Math.cos(e)*t,l.pos.y+Y(.1,.5),l.pos.z+Math.sin(e)*t,0,Y(1.2,2.6),0,n[Math.random()*n.length|0],Y(.05,.09),Y(.5,.9),-.5,.2)}return a.glowNow(l.pos.x,l.pos.y+.12,l.pos.z,n[n.length>2?2:0],1.7+Math.sin(c.t*9)*.15,.35),!0}});return o[t]=s,s}var hc={blade:{c:16773824,h:16777215},budgeblade:{c:12124026,h:16777215},dual:{c:14152959,h:16777215},axe:{c:16769200,h:16777215},hammer:{c:16767392,h:16777215},darkscythe:{c:11689215,h:15786239},yetisword:{c:10476799,h:16777215},yetigreatsword:{c:10476799,h:16777215},yetidual:{c:12577535,h:16777215},yetihammer:{c:12577535,h:16777215},yetispear:{c:12577535,h:16777215},yetiscythe:{c:10476799,h:16777215},tigerclaws:{c:16751162,h:16773312},tigerspear:{c:16751162,h:16773312},raptorsaber:{c:13818482,h:16777215},raptorscythe:{c:13818482,h:16777215},piratecutlass:{c:14674165,h:16771488},piratedual:{c:14674165,h:16771488},piratecleaver:{c:15265528,h:16767322},cursedblade:{c:6094746,h:14745576},demonsword:{c:16726554,h:16765088},holyhammer:{c:10473727,h:16777215}};function gc(e,t,n,r,i,a=null){let o=e.vfx,s=t.facing,c=fc(s),l=hc[n.held]||hc.blade,u=a?!!a.heavy:r===2,d=t.pos.x,f=t.pos.z,p=n.style===`twohand`||n.dur>.5,m=Math.max(1.3,i*.88),h=i*(p?.32:.22);if(a?.thrust){if(o.slashArc(d,t.pos.y+1.1,f,c,{radius:m*1.08,thick:h*(u?1.5:1.15),sweep:u?.5:.36,color:l.c,hot:u?16765562:l.h,tilt:0,life:u?.24:.16,sweepT:.06,tail:.95}),u){let e=d+s.x*i*.95,n=f+s.z*i*.95;o.ring(e,t.pos.y+1.1,n,{axis:s,color:16765562,r0:.1,r1:1.1,life:.24,thick:.18,fill:.15}),o.sparks(e,t.pos.y+1.1,n,[16765562,16777215,l.c],10,6,.06,.35,4)}}else if(a?.spin)o.slashArc(d,t.pos.y+1,f,c,{radius:m*1.02,thick:h*1.1,sweep:Math.PI*2-.2,color:l.c,hot:16765562,tilt:0,flip:-1,life:.36,sweepT:.22,tail:.9}),o.ring(d,e.world.heightAt(d,f)+.1,f,{color:l.c,r0:.4,r1:m*1.1,life:.34,thick:.12,fill:.15});else if(u){let n=a?.tilt??1.2;o.slashArc(d,t.pos.y+1.15,f,c,{radius:m*1.05,thick:h*1.15,sweep:2.5,color:16765562,hot:l.c,tilt:n,life:.32,sweepT:.17,grow:.15,tail:.85}),a?.cross?o.slashArc(d,t.pos.y+1.15,f,c,{radius:m*1,thick:h,sweep:2.3,color:l.c,hot:16765562,tilt:-n,flip:-1,life:.3,sweepT:.17,delay:0}):o.slashArc(d,t.pos.y+1,f,c,{radius:m*.9,thick:h*.6,sweep:2.2,color:l.c,hot:l.c,tilt:n*.92,life:.26,sweepT:.14,delay:0});let r=d+s.x*i*.85,u=f+s.z*i*.85;o.ring(r,e.world.heightAt(r,u)+.1,u,{color:16765562,r0:.2,r1:1.7,life:.32,thick:.16,fill:.2}),o.sparks(r,e.world.heightAt(r,u)+.15,u,[16765562,16777215,14272928],12,5,.07,.45,9),o.scorch(r,u,.9,3812896,.35,3)}else{let e=a?.flip??(r===1?-1:1),i=a?.tilt??e*.38,s=a?.sweep??2.1+(n.arc||2)*.2;o.slashArc(d,t.pos.y+1,f,c,{radius:m,thick:h,sweep:s,color:l.c,hot:l.c,tilt:i,flip:e,life:.2,sweepT:.11,gain:.7}),n.style===`dual`&&!a&&o.slashArc(d,t.pos.y+1.1,f,c,{radius:m*.9,thick:h*.8,sweep:2,color:l.c,hot:l.h,tilt:-e*.5,flip:-e,life:.2,sweepT:.11,delay:0})}let g=pc(t);o.glow(g.x+s.x*.55,g.y,g.z+s.z*.55,l.c,.42,.1,{grow:.15,gain:.55})}var _c={shieldbash(e,t,n,r){let i=e.vfx,a=t.facing,o=t.pos.y+1,s=fc(a);i.slashArc(t.pos.x,o,t.pos.z,s,{radius:r*.9,thick:1,sweep:1.7,color:10475775,hot:16777215,life:.24,sweepT:.1,tail:.9});let c=t.pos.x+a.x*1.3,l=t.pos.z+a.z*1.3;i.ring(c,o,l,{axis:a,color:12576511,r0:.15,r1:1.7,life:.3,thick:.2,fill:.2}),i.ring(c,o,l,{axis:a,color:16777215,r0:.1,r1:1.1,life:.2,thick:.3,delay:.04}),i.glow(c,o,l,16777215,2,.16,{grow:.5}),i.glow(c,o,l,8374527,3.2,.3,{grow:.6});for(let e=0;e<i.n(12);e++){let t=Y(-.7,.7),n=Y(4,9),r=a.x*Math.cos(t)-a.z*Math.sin(t),s=a.x*Math.sin(t)+a.z*Math.cos(t);i.spark(c,o+Y(-.3,.3),l,r*n,Y(0,2),s*n,e%2?16777215:10475775,.08,.35,6,1)}n&&i.flash(c,o,l,10475775,3,.2)},bulwark(e,t,n){let r=e.vfx;r.dome(()=>t.pos,{radius:1.45,color:10475775,life:n,lift:.95}),r.ring(t.pos.x,t.pos.y+.1,t.pos.z,{color:10475775,r0:.3,r1:2.2,life:.5,thick:.12,fill:.2}),r.ring(t.pos.x,t.pos.y+.1,t.pos.z,{color:16777215,r0:.2,r1:1.6,life:.35,thick:.2,delay:.08}),r.sparks(t.pos.x,t.pos.y+.2,t.pos.z,[16777215,10475775],14,3,.07,.6,-2,2,1),r.glow(t.pos.x,t.pos.y+1,t.pos.z,10475775,3.4,.35,{grow:.5})},ironcitadel(e,t,n){let r=e.vfx;r.dome(()=>t.pos,{radius:1.65,color:16767370,life:n,lift:.95}),r.ring(t.pos.x,t.pos.y+.1,t.pos.z,{color:16767370,r0:.3,r1:2.6,life:.5,thick:.12,fill:.2}),r.glow(t.pos.x,t.pos.y+1,t.pos.z,16767370,3.6,.35,{grow:.5}),r.prism(t.pos.x,t.pos.y,t.pos.z,{w:1.1,h:3.4,segs:6,color:16767370,core:16773312,rise:.12,hold:.1,fall:.35,taper:.4,alpha:.3,flicker:!0});let i=e.time;r.add({update:(a,o)=>{if(o.t>n||t.ironT<=0||t.ironHits<=0)return!1;for(let n=0;n<t.ironHits;n++){let a=(e.time-i)*2.4+n/3*Js;r.glowNow(t.pos.x+Math.cos(a)*1.35,t.pos.y+1+Math.sin(a*1.5)*.12,t.pos.z+Math.sin(a)*1.35,16771504,1,.95),r.glowNow(t.pos.x+Math.cos(a)*1.35,t.pos.y+1+Math.sin(a*1.5)*.12,t.pos.z+Math.sin(a)*1.35,16777215,.4,.9)}return!0}})},whirlwind(e,t,n,r=16757575,i=16773296){let a=e.vfx,o=t.pos.y;a.slashArc(t.pos.x,o+.9,t.pos.z,fc(t.facing)-1.5,{radius:n*.92,thick:n*.4,sweep:5.6,color:r,hot:i,life:.4,sweepT:.24,tail:.95,grow:.08,follow:()=>t.pos,lift:.9}),a.slashArc(t.pos.x,o+.55,t.pos.z,fc(t.facing)+1.2,{radius:n*.78,thick:n*.3,sweep:5.2,color:i,hot:16777215,life:.34,sweepT:.2,flip:-1,tail:.9,tilt:.12,follow:()=>t.pos,lift:.55}),a.ring(t.pos.x,o+.1,t.pos.z,{color:r,r0:.4,r1:n*1.15,life:.4,thick:.1,fill:.15}),a.ring(t.pos.x,o+.12,t.pos.z,{color:i,r0:.3,r1:n*.9,life:.3,thick:.14,delay:.06}),e.time,a.add({update:(e,o)=>{if(o.t>.42)return!1;let s=o.t*15;for(let e=0;e<2;e++){let o=s+e*Math.PI;a.glow(t.pos.x+Math.cos(o)*n*.85,t.pos.y+.8,t.pos.z+Math.sin(o)*n*.85,r,1.1,.22,{grow:.4}),a.spark(t.pos.x+Math.cos(o)*n*.9,t.pos.y+.8,t.pos.z+Math.sin(o)*n*.9,-Math.sin(o)*4,Y(.5,2),Math.cos(o)*4,i,.07,.35,4,1)}return!0}}),e.fx.dust(t.pos.x,t.pos.y,t.pos.z,8,n*1.3,14272928)},bloodstorm(e,t,n){let r=e.vfx;_c.whirlwind(e,t,n,16726586,16765088),r.slashArc(t.pos.x,t.pos.y+1.4,t.pos.z,fc(t.facing),{radius:n*.85,thick:n*.35,sweep:5.8,color:12589080,hot:16751226,life:.46,sweepT:.28,tilt:.5,follow:()=>t.pos,lift:1.4,flip:-1});let i=r.n(7);for(let e=0;e<i;e++){let a=e/i*Js,o=n*.8;r.prism(t.pos.x+Math.cos(a)*o,t.pos.y,t.pos.z+Math.sin(a)*o,{w:.34,h:Y(1.4,2.2),segs:5,color:12589080,core:16751226,delay:e*.03,rise:.12,hold:.1,fall:.35,flicker:!0,tilt:.2})}r.glow(t.pos.x,t.pos.y+1,t.pos.z,16726586,n*1.8,.4,{grow:.5,gain:.8}),r.sparks(t.pos.x,t.pos.y+.5,t.pos.z,[16726586,16751226,16777215],22,6,.09,.7,4,1.5,.5),r.flash(t.pos.x,t.pos.y+1,t.pos.z,16722474,4,.35)},execute(e,t,n,r){let i=e.vfx,a=t.facing,o=fc(a),s=n?16726570:16743002;i.slashArc(t.pos.x,t.pos.y+1.2,t.pos.z,o,{radius:2.5,thick:1.5,sweep:2.6,color:s,hot:16777215,tilt:1.2,life:.36,sweepT:.17,tail:.9,grow:.15}),i.slashArc(t.pos.x,t.pos.y+1.1,t.pos.z,o,{radius:2.3,thick:.8,sweep:2.4,color:16765104,hot:16777215,tilt:1.2,life:.28,sweepT:.13});let c=t.pos.x+a.x*2.3,l=t.pos.z+a.z*2.3,u=e.world.heightAt(c,l);for(let e=0;e<7;e++){let n=.6+e*.55;i.glow(t.pos.x+a.x*n,u+.2,t.pos.z+a.z*n,16734778,1.4,.4,{delay:e*.025,grow:.5})}i.streak({x:t.pos.x+a.x*.8,y:u+.1,z:t.pos.z+a.z*.8},{x:t.pos.x+a.x*4,y:u+.1,z:t.pos.z+a.z*4},{color:s,width:.35,life:.4,flat:!0}),i.scorch(c,l,1.1,1706504,.45,4),i.sparks(c,u+.2,l,[16734778,16765104,16777215],16,6,.08,.5,8),n?(i.ring(c,u+1,l,{axis:`cam`,color:16726570,r0:.2,r1:2.4,life:.35,thick:.14}),i.glow(c,u+1,l,16777215,3.6,.2,{grow:.7}),i.flash(c,u+1,l,16726570,5,.3)):r&&i.flash(c,u+1,l,16743002,2.5,.2)},leapStart(e,t){let n=e.vfx;n.ring(t.pos.x,t.pos.y+.1,t.pos.z,{color:14272928,r0:.3,r1:1.8,life:.35,thick:.16,fill:.2}),e.fx.dust(t.pos.x,t.pos.y,t.pos.z,8,1.8),n.sparks(t.pos.x,t.pos.y+.3,t.pos.z,[16765562,16777215],8,3,.07,.4,5);let r=n.trail(16769184,{width:.55,life:.4,pts:24,white:.4});n.add({update:(e,n)=>(r.add(t.pos.x,t.pos.y+.9,t.pos.z),n.t>.5||t.dead?(r.end(),!1):!0)})},leapImpact(e,t,n,r,i){let a=e.vfx;a.glow(t,n+.3,r,16777215,i*1.6,.12,{grow:.5}),a.glow(t,n+.3,r,16765562,i*2.4,.3,{grow:.6}),a.ring(t,n+.12,r,{color:16769184,r0:.3,r1:i*1.6,life:.4,thick:.15,fill:.25}),a.ring(t,n+.14,r,{color:14272928,r0:.2,r1:i*2.2,life:.55,thick:.08,delay:.06});let o=a.n(9);for(let s=0;s<o;s++){let c=s/o*Js+Y(-.2,.2),l=i*Y(.55,.9),u=t+Math.cos(c)*l,d=r+Math.sin(c)*l;a.prism(u,e.world.heightAt(u,d)-.1,d,{w:Y(.28,.42),h:Y(.7,1.3),segs:3,color:8020552,core:14272928,solid:!0,taper:.5,tilt:.35,delay:s*.012,rise:.1,hold:.18,fall:.3,onShatter:(t,n,r)=>e.fx.dust(t,n,r,2,.8,12101776)}),a.streak({x:t,y:n+.1,z:r},{x:t+Math.cos(c)*i*1.2,y:n+.1,z:r+Math.sin(c)*i*1.2},{color:16765562,width:.14,life:.45,flat:!0})}a.sparks(t,n+.2,r,[16765562,16777215,14272928],20,7,.09,.6,9),e.fx.dust(t,n,r,14,i*1.2),a.scorch(t,r,i*.9,2760212,.4,4),a.flash(t,n+.5,r,16765562,4,.3)},earthquake(e,t,n){let r=e.vfx,i=t.pos.x,a=t.pos.z,o=t.pos.y;r.glow(i,o+.3,a,16777215,n*1.4,.12,{grow:.5}),r.glow(i,o+.3,a,15247440,n*2.4,.4,{grow:.6,gain:.8});for(let e=0;e<3;e++)r.ring(i,o+.12+e*.01,a,{color:e===1?16777215:15247440,r0:.3,r1:n*(1.3+e*.3),life:.4+e*.12,thick:.1+e*.03,delay:e*.1,fill:e===0?.25:0});let s=r.n(14);for(let t=0;t<s;t++){let o=t/s*Js+Y(-.15,.15),c=Y(.7,n*.95),l=i+Math.cos(o)*c,u=a+Math.sin(o)*c;r.prism(l,e.world.heightAt(l,u)-.15,u,{w:Y(.3,.55),h:Y(.9,2),segs:4,color:7232066,core:13219994,solid:!0,taper:.45,tilt:.3,delay:c/n*.15,rise:.12,hold:.3,fall:.35,onShatter:(t,n,r)=>e.fx.dust(t,n,r,2,1,12101776)})}for(let e=0;e<8;e++){let t=e/8*Js+.2;r.streak({x:i,y:o+.12,z:a},{x:i+Math.cos(t)*n*1.15,y:o+.12,z:a+Math.sin(t)*n*1.15},{color:16760944,width:.22,life:.6,flat:!0})}r.sparks(i,o+.2,a,[16760944,16777215,14272928],24,8,.09,.7,9),e.fx.dust(i,o,a,16,n*1.3),r.scorch(i,a,n*1,1708554,.5,6),r.flash(i,o+.5,a,15247440,4,.3)},warcry(e,t,n,r){let i=e.vfx,a=t.pos.x,o=t.pos.z,s=t.pos.y;for(let e=0;e<3;e++)i.ring(a,s+.12,o,{color:e===1?16765088:16730682,r0:.4,r1:n*(.9+e*.15),life:.5+e*.1,thick:.1,delay:e*.11,fill:e===0?.2:0}),i.ring(a,s+1.3,o,{axis:`cam`,color:16738890,r0:.2,r1:1.6+e*.8,life:.4,thick:.1,delay:e*.1});i.prism(a,s,o,{w:1.3,h:5.5,segs:7,color:16726570,core:16756880,rise:.14,hold:.2,fall:.5,taper:.4,alpha:.3,flicker:!0}),i.glow(a,s+1.2,o,16777215,3,.14,{grow:.6}),i.glow(a,s+1.2,o,16734778,6,.5,{grow:.7,gain:.7}),i.sparks(a,s+.8,o,[16769216,16734778,16722458],30,7,.1,.9,3,1,.5),i.flash(a,s+1,o,16730682,4,.4),e.fx.dust(a,s,o,10,n*.7),mc(e,`warcry`,[16769216,16742986,16726570],()=>e.player.warcryT>0)},callwolf(e,t,n,r){let i=e.vfx;i.ring(t,n+.1,r,{color:10479871,r0:.3,r1:1.6,life:.6,thick:.1,fill:.2}),i.ring(t,n+.12,r,{color:16777215,r0:.2,r1:1,life:.4,thick:.16,delay:.1}),i.prism(t,n,r,{w:.8,h:3,segs:6,color:7325951,core:13693183,rise:.15,hold:.25,fall:.4,taper:.4,alpha:.3,flicker:!0}),i.glow(t,n+.7,r,10479871,3.2,.5,{grow:.6}),i.sparks(t,n+.3,r,[16777215,10479871,13808780],18,3,.07,.8,-1,2,1)},packtactics(e,t,n,r){let i=e.vfx;i.ring(t.pos.x,t.pos.y+.1,t.pos.z,{color:13808780,r0:.3,r1:3.2,life:.45,thick:.1,fill:.15}),i.glow(t.pos.x,t.pos.y+1,t.pos.z,16754768,3.2,.3,{grow:.5}),n&&(i.ring(n.x,n.y+.1,n.z,{color:16754768,r0:.3,r1:2,life:.4,thick:.12}),i.glow(n.x,n.y+.7,n.z,16754768,3,.3,{grow:.5})),mc(e,`pack`,[16773312,16754768,15231530],()=>e.player.packT>0)},howl(e,t,n,r){let i=e.vfx,a=t.facing,o=t.pos.y+1.55,s=(e,t,n,r,a)=>{for(let o=0;o<4;o++)i.ring(e+r*(.4+o*.35),t,n+a*(.4+o*.35),{axis:{x:r,y:.2,z:a},color:15784352,r0:.25,r1:2.4+o*.5,life:.5,thick:.1,delay:o*.1})};s(t.pos.x,o,t.pos.z,a.x,a.z),n&&s(n.x,n.y+.9,n.z,a.x,a.z),i.ring(t.pos.x,t.pos.y+.12,t.pos.z,{color:15784352,r0:.4,r1:r*1.1,life:.5,thick:.08}),i.glow(t.pos.x,o,t.pos.z,16773312,2.4,.4,{grow:.7}),i.sparks(t.pos.x,o,t.pos.z,[16773312,15784352],12,4,.07,.6,0,0,.8)},poisonvolley(e,t){let n=e.vfx,r=pc(t);n.glow(r.x,r.y,r.z,9429850,2.2,.2,{grow:.6}),n.ring(r.x+t.facing.x*.4,r.y,r.z+t.facing.z*.4,{axis:t.facing,color:9429850,r0:.1,r1:1,life:.22,thick:.2}),n.sparks(r.x,r.y,r.z,ec,8,3,.07,.5,2)},aimedshot(e,t){let n=e.vfx,r=pc(t),i=t.facing;n.ring(r.x+i.x*.5,r.y,r.z+i.z*.5,{axis:i,color:16765503,r0:1.1,r1:.1,life:.22,thick:.18,ease:`lin`}),n.ring(r.x+i.x*.5,r.y,r.z+i.z*.5,{axis:i,color:16777215,r0:.1,r1:1.4,life:.25,thick:.15,delay:.1}),n.glow(r.x,r.y,r.z,16765503,2.4,.22,{grow:.6}),n.sparks(r.x,r.y,r.z,[16777215,16765503],8,5,.06,.4,3)},snipe(e,t){let n=e.vfx,r=pc(t),i=t.facing;n.ring(r.x+i.x*.5,r.y,r.z+i.z*.5,{axis:i,color:11463167,r0:1.4,r1:.1,life:.26,thick:.18,ease:`lin`}),n.ring(r.x+i.x*.6,r.y,r.z+i.z*.6,{axis:i,color:16777215,r0:.1,r1:2,life:.3,thick:.12,delay:.12}),n.glow(r.x,r.y,r.z,16777215,2.2,.14,{grow:.6}),n.glow(r.x,r.y,r.z,9430271,3.4,.3,{grow:.6}),n.streak({x:r.x,y:r.y,z:r.z},{x:r.x+i.x*16,y:r.y,z:r.z+i.z*16},{color:11463167,width:.18,life:.25}),n.sparks(r.x,r.y,r.z,[16777215,9430271],10,6,.06,.4,3)},plaguearrow(e,t){let n=e.vfx,r=pc(t);n.glow(r.x,r.y,r.z,10115808,2.6,.26,{grow:.6}),n.glow(r.x,r.y,r.z,9429850,1.6,.2,{grow:.5}),n.sparks(r.x,r.y,r.z,[14155696,10115808,7196234],10,3,.07,.6,-1)},markedprey(e,t,n){let r=e.vfx,i=pc(t),a=n.y+(n.hover||0)+.9;r.streak({x:i.x,y:i.y,z:i.z},{x:n.x,y:a,z:n.z},{color:16765503,width:.12,life:.3});for(let e=0;e<3;e++)r.ring(n.x,a,n.z,{axis:`cam`,color:16765503,r0:2.2-e*.3,r1:.7,life:.35,thick:.08,delay:e*.07,ease:`lin`});r.glow(n.x,a,n.z,16765503,3,.3,{grow:.5}),r.sparks(n.x,a,n.z,[16777215,16765503],10,3,.07,.5,-1)},fireball(e,t){let n=e.vfx,r=pc(t);n.glow(r.x,r.y,r.z,16773296,1.6,.14,{grow:.6}),n.glow(r.x,r.y,r.z,16742938,3,.3,{grow:.6}),n.ring(r.x+t.facing.x*.4,r.y,r.z+t.facing.z*.4,{axis:t.facing,color:16751162,r0:.1,r1:1,life:.22,thick:.22}),n.sparks(r.x,r.y,r.z,Xs,12,4,.08,.45,5),n.flash(r.x,r.y,r.z,16747050,3,.2)},flamewave(e,t,n){let r=e.vfx,i=t.facing,a=i.z,o=-i.x,s=(t,n)=>e.world.heightAt(t,n);r.slashArc(t.pos.x,t.pos.y+.55,t.pos.z,fc(i),{radius:n*.92,thick:n*.55,sweep:1.55,color:16742938,hot:16771488,life:.45,sweepT:.22,tail:.95,grow:.12});for(let e=0;e<5;e++){let c=.9+n/5*e*.9,l=c*.55,u=e<2?2:3;for(let n=0;n<u;n++){let d=u===1?0:(n/(u-1)-.5)*2*l,f=t.pos.x+i.x*c+a*d,p=t.pos.z+i.z*c+o*d;r.prism(f,s(f,p),p,{w:.42+e*.04,h:Y(1,1.6)+e*.1,segs:5,color:16738842,core:16773808,delay:e*.05+Y(0,.03),rise:.12,hold:.14,fall:.4,flicker:!0,tilt:.12}),r.glow(f,s(f,p)+.6,p,16747050,2.2,.4,{delay:e*.05,grow:.5,gain:.7})}}let c=t.pos.x+i.x*1.3,l=t.pos.z+i.z*1.3;r.sparks(c,t.pos.y+.9,l,Xs,22,6,.1,.7,2,1.5,.4),r.flash(c,t.pos.y+1,l,16747050,4,.4)},frostbolt(e,t){let n=e.vfx,r=pc(t);n.glow(r.x,r.y,r.z,16777215,1.4,.14,{grow:.6}),n.glow(r.x,r.y,r.z,8376575,2.8,.3,{grow:.6}),n.ring(r.x+t.facing.x*.4,r.y,r.z+t.facing.z*.4,{axis:t.facing,color:10476799,r0:.1,r1:.9,life:.22,thick:.22}),n.sparks(r.x,r.y,r.z,Zs,10,3.5,.07,.5,4)},icenova(e,t,n){let r=e.vfx,i=t.pos.x,a=t.pos.z,o=t.pos.y;r.glow(i,o+.5,a,16777215,n*1.2,.14,{grow:.6}),r.glow(i,o+.5,a,8376575,n*2,.45,{grow:.8,gain:.8}),r.ring(i,o+.12,a,{color:12577535,r0:.3,r1:n*1.35,life:.45,thick:.16,fill:.3}),r.ring(i,o+.14,a,{color:16777215,r0:.2,r1:n*1.1,life:.3,thick:.1,delay:.05}),r.ring(i,o+.9,a,{axis:`cam`,color:14152959,r0:.2,r1:n*.8,life:.3,thick:.1}),[[n*.92,11,1.3],[n*.55,7,1]].forEach(([t,n,o],s)=>{let c=r.n(n);for(let n=0;n<c;n++){let l=n/c*Js+s*.4+Y(-.1,.1),u=i+Math.cos(l)*t,d=a+Math.sin(l)*t;r.prism(u,e.world.heightAt(u,d)-.1,d,{w:Y(.3,.45),h:o*Y(.8,1.4),segs:4,color:9426175,core:16777215,solid:!0,taper:.1,tilt:.35,delay:s*.07+n%3*.02,rise:.1,hold:.45,fall:.35,onShatter:(e,t,n)=>r.sparks(e,t,n,Zs,5,3,.08,.5,9)})}}),r.sparks(i,o+.5,a,Zs,24,7,.08,.8,3,1,.6),r.scorch(i,a,n*.9,13627135,.5,3),r.flash(i,o+.7,a,9426175,4,.35)},glacier(e,t,n){let r=e.vfx,i=t.facing,a=i.z,o=-i.x;r.slashArc(t.pos.x,t.pos.y+.5,t.pos.z,fc(i),{radius:n*.9,thick:n*.5,sweep:1.6,color:9426175,hot:16777215,life:.45,sweepT:.2,tail:.95});for(let s=0;s<5;s++){let c=.9+n/5*s*.85,l=c*.5,u=s===0?2:3;for(let n=0;n<u;n++){let d=(n/(u-1)-.5)*2*l+Y(-.15,.15),f=t.pos.x+i.x*c+a*d,p=t.pos.z+i.z*c+o*d;r.prism(f,e.world.heightAt(f,p)-.1,p,{w:Y(.4,.55),h:Y(1.3,2.1)+s*.15,segs:5,color:8374527,core:16777215,solid:!0,taper:.08,tilt:.28,delay:s*.055,rise:.11,hold:.45,fall:.35,onShatter:(e,t,n)=>r.sparks(e,t,n,Zs,5,3,.08,.5,9)})}}r.sparks(t.pos.x+i.x*1.5,t.pos.y+.8,t.pos.z+i.z*1.5,Zs,20,6,.08,.7,3,1,.5),r.flash(t.pos.x+i.x*2,t.pos.y+1,t.pos.z+i.z*2,9426175,3.5,.35)},spark(e,t){let n=e.vfx,r=pc(t);n.glow(r.x,r.y,r.z,16777215,1.2,.1,{grow:.5}),n.glow(r.x,r.y,r.z,4903167,2.2,.2,{grow:.6}),n.bolt(r,{x:r.x+t.facing.x*1.3,y:r.y+.05,z:r.z+t.facing.z*1.3},{seg:4,width:.1,jag:.2,life:.12,branches:0,color:12972287}),n.sparks(r.x,r.y,r.z,Qs,6,4,.06,.3,0)},thunderclap(e,t,n){let r=e.vfx,i=t.pos.x,a=t.pos.z,o=t.pos.y;r.bolt({x:i+Y(-.4,.4),y:o+13,z:a+Y(-.4,.4)},{x:i,y:o+.1,z:a},{seg:14,width:.42,jag:.55,life:.34,branches:3,color:12971263}),r.glow(i,o+.6,a,16777215,n*1.6,.14,{grow:.6}),r.glow(i,o+.6,a,7330047,n*2.8,.4,{grow:.7,gain:.8});let s=r.n(7);for(let t=0;t<s;t++){let c=t/s*Js+Y(-.2,.2),l=i+Math.cos(c)*n*Y(.8,1.15),u=a+Math.sin(c)*n*Y(.8,1.15);r.bolt({x:i,y:o+.4,z:a},{x:l,y:e.world.heightAt(l,u)+.15,z:u},{seg:8,width:.16,jag:.5,life:.26,branches:1,color:11920383})}r.ring(i,o+.12,a,{color:14148863,r0:.4,r1:n*1.35,life:.4,thick:.14,fill:.3}),r.ring(i,o+.14,a,{color:16777215,r0:.3,r1:n*1,life:.28,thick:.1,delay:.04}),r.ring(i,o+1,a,{axis:`cam`,color:11920383,r0:.3,r1:n*.9,life:.3,thick:.12}),r.sparks(i,o+.5,a,Qs,28,8,.08,.6,4,1,.5),r.scorch(i,a,n*.8,1052696,.5,5),r.flash(i,o+2,a,11461887,9,.4)}};function vc(e,t,n,r={}){let i=e.vfx;i.bolt(t,n,{seg:9,width:r.width??.2,jag:.45,life:.3,branches:2,color:12971263}),i.glow(n.x,n.y,n.z,16777215,1.5,.12,{grow:.5}),i.glow(n.x,n.y,n.z,4903167,3,.3,{grow:.8}),i.ring(n.x,n.y,n.z,{axis:`cam`,color:10479871,r0:.1,r1:1.2,life:.22,thick:.18}),i.sparks(n.x,n.y,n.z,Qs,10,6,.07,.4,5),i.flash(n.x,n.y,n.z,7330047,3.5,.2)}function yc(e,t,n,r){let i=e.vfx,a=e.world.heightAt(t,n),o=.85,s={x:t+7,y:a+24,z:n-5};e.fx.telegraph(t,a,n,0,`circle`,3.3,0,16734746,.95),i.ring(t,a+.12,n,{color:16734746,r0:4,r1:.6,life:o,thick:.05,ease:`lin`,gain:.8});let c=i.trail(16738842,{width:1.1,life:.5,pts:30,white:.6,step:.2}),l=!1;i.add({update:(u,d)=>{let f=Math.min(1,d.t/o),p=f**1.7,m=s.x+(t-s.x)*p,h=s.y+(a+.6-s.y)*p,g=s.z+(n-s.z)*p;if(c.add(m,h,g),i.glowNow(m,h,g,16742938,5.2,.9),i.glowNow(m,h,g,16773296,2.6,.9),i.glowNow(m,h,g,16777215,1.2,1),Math.random()<u*60*i.density&&i.spark(m,h,g,Y(-1,1),Y(-1,2),Y(-1,1),Xs[Math.random()*4|0],Y(.1,.2),Y(.4,.8),3,1),Math.random()<u*40&&e.fx.emit(m,h,g,Y(-.5,.5),Y(0,1),Y(-.5,.5),3813424,Y(.2,.34),Y(.6,1),-.5),i.flash(m,h,g,16747050,4,.12),f>=1&&!l){l=!0,c.end(),dc(e,t,a+.7,n,3.4),i.ring(t,a+.9,n,{axis:`cam`,color:16777215,r0:.3,r1:5,life:.3,thick:.1});for(let r=0;r<i.n(14);r++){let i=Y(0,Js),o=Y(3,8);e.fx.emit(t,a+.5,n,Math.cos(i)*o,Y(4,9),Math.sin(i)*o,r%2?5916214:2761248,Y(.14,.26),Y(.7,1.2),14)}return r(),!1}return!0}})}function bc(e,t,n){let r=e.vfx;if(!r||t.dead)return;let i=t.y+(t.hover||0),a=Math.max(.9,(t.radius||.5)*2.1),o=t.radius||.5;if(t.burnT>0&&Math.random()<n*28*r.density){let n=Y(0,Js),s=Y(0,o*.9),c=t.x+Math.cos(n)*s,l=t.z+Math.sin(n)*s,u=i+Y(.2,a);r.glow(c,u,l,xc(),Y(.7,1.2),Y(.35,.6),{vy:Y(1,2),grow:-.3,gain:.8}),r.spark(c,u,l,Y(-.3,.3),Y(1.2,2.5),Y(-.3,.3),Xs[Math.random()*4|0],.06,.6,-1,.3),Math.random()<.3&&e.fx.emit(c,u+.2,l,0,1,0,3814452,.12,.6,-1)}if(t.poisonT>0&&Math.random()<n*14*r.density){let e=Y(0,Js),n=t.x+Math.cos(e)*o*Y(.3,1),s=t.z+Math.sin(e)*o*Y(.3,1),c=i+Y(.2,a);r.glow(n,c,s,7196234,Y(.5,.9),Y(.5,.9),{vy:Y(.4,1),gain:.8}),r.spark(n,c,s,0,Y(.6,1.2),0,12124026,.06,.8,-.5,.2)}if(t.slowT>0&&Math.random()<n*12*r.density){let e=Y(0,Js),n=t.x+Math.cos(e)*o*Y(.4,1),s=t.z+Math.sin(e)*o*Y(.4,1);r.spark(n,i+Y(.1,a),s,0,Y(.3,.8),0,14152959,.07,.8,-.2,.2),r.glow(t.x,i+.1,t.z,9426175,o*3.2,.1,{gain:.35,grow:0})}if(t.markT>0){let n=e.time*3,o=i+a+.7;for(let e=0;e<4;e++){let i=n+e/4*Js;r.glowNow(t.x+Math.cos(i)*.5,o,t.z+Math.sin(i)*.5,16765503,.5,.9)}r.glowNow(t.x,o-.35+Math.sin(e.time*6)*.08,t.z,16769658,.6,1),r.glowNow(t.x,o-.6+Math.sin(e.time*6)*.08,t.z,16765503,.4,.9)}if(t.stun>.05){let n=e.time*5,o=i+a+.35;for(let e=0;e<3;e++){let i=n+e/3*Js;r.glowNow(t.x+Math.cos(i)*.55,o+Math.sin(i*2)*.05,t.z+Math.sin(i)*.55,16769658,.55,1)}}}function xc(){return Math.random()<.5?16747038:16765530}var Sc=(e,t,n,r,i=0,a=.06)=>U(e,a,l(t,n,r,i));function Cc(e,t,n,r,i,o,s=!0){let c=e.build(t,n,r,i),l=new V;if(c.solid){let e=new yt(c.solid,o);e.castShadow=s,l.add(e)}return c.glow&&l.add(new yt(c.glow,new a({vertexColors:!0}))),l}function wc(e,t,n,r,i,a,o,s,c,u=.3,d=-99){for(let f=Math.floor(r-o-1);f<=Math.ceil(r+o+1);f++)for(let p=Math.floor(n-a-1);p<=Math.ceil(n+a+1);p++)for(let m=Math.floor(t-i-1);m<=Math.ceil(t+i+1);m++){if(p<d)continue;let h=(m+.5-t)/i,g=(p+.5-n)/a,_=(f+.5-r)/o,v=h*h+g*g+_*_;v<=1+(l(m,p,f,c)-.5)*u&&e.set(m,p,f,typeof s==`function`?s(m,p,f,v):s)}}function Tc(e=`green`){let t=at({vertexColors:!0,emissive:new N(0)}),n=e===`green`?{lo:3519061,mid:5756012,hi:10810767,eye:16777215}:{lo:6960816,mid:9196250,hi:13212415,eye:16773280},r=new W(20,18,20);wc(r,10,6.5,10,8.2,6.2,8.2,(e,t,r,i)=>{let a=z((t-1)/11,0,1),o=a<.35?v(n.lo,n.mid,a/.35):v(n.mid,n.hi,(a-.35)/.65);return i>.82&&(o=m(o,.88)),Sc(o,e,t,r,3,.04)},5,.18,1);for(let e of[6,12]){for(let t=6;t<=9;t++)for(let i=e;i<=e+1;i++)r.set(i,t,17,n.eye);for(let t=6;t<=8;t++)r.set(e+ +(e<10),t,18,1708064);r.set(e+(e<10?0:1),9,18,16777215)}for(let e=8;e<=11;e++)r.set(e,5,18,2757168);if(r.set(7,6,18,2757168),r.set(12,6,18,2757168),e===`green`)r.box(9,12,9,11,14,11,4169543),r.box(8,14,8,12,15,12,7328858);else for(let[e,t,n]of[[6,8,4],[12,9,5],[9,12,3]])for(let i=12;i<12+n;i++)r.set(e,i,t,v(9063128,14727423,(i-12)/n),!0);let i=new V,a=Cc(r,.06,10,0,10,t);return i.add(a),{root:i,body:a,mat:t,parts:{body:a}}}function Ec(){let e=.065,t=at({vertexColors:!0,emissive:new N(0)}),n=(e,t,n)=>Sc(v(7225896,9066036,l(e>>1,t>>1,n>>1,3)),e,t,n,4,.07),r=new W(18,20,30);r.box(3,2,2,15,13,26,(e,t,r)=>t<5?Sc(11041366,e,t,r,5,.07):n(e,t,r)),r.box(4,13,4,14,14,24,n),r.box(5,12,2,13,14,8,n);for(let e=4;e<26;e+=2)r.box(8,14,e,10,16+ +(e%4==0),e+1,(e,t,n)=>Sc(3087378,e,t,n,6,.1));r.box(2,4,8,3,11,20,(e,t,r)=>n(e,t,r)),r.box(15,4,8,16,11,20,(e,t,r)=>n(e,t,r));let i=new W(16,16,20);i.box(3,3,4,13,13,14,(e,t,r)=>n(e,t,r)),i.box(5,3,14,11,8,18,(e,t,n)=>Sc(13211258,e,t,n,7,.06)),i.box(6,4,18,10,7,19,14199436),i.set(7,5,19,2759188),i.set(9,5,19,2759188),i.box(3,8,14,4,12,15,16774096),i.box(12,8,14,13,12,15,16774096);for(let e of[4,11])i.box(e-1,5,15,e,9,16,15984324),i.box(e-1,8,16,e,11,17,15984324);for(let e of[3,12])i.box(e,13,6,e+2,16,8,(e,t,r)=>n(e,t,r));i.set(5,10,14,16777215),i.set(6,10,14,16726570),i.set(10,10,14,16726570),i.set(11,10,14,16777215),i.box(4,12,14,7,13,15,1905164),i.box(9,12,14,12,13,15,1905164);let a=new W(8,12,8);a.box(2,2,2,6,12,6,(e,t,r)=>n(e,t,r)),a.box(2,0,2,6,2,6,2759188);let o=new V,s=Cc(r,e,9,0,14,t);s.position.y=9*e,o.add(s);let c=Cc(i,e,8,8,4,t);c.position.set(0,18*e,12*e),o.add(c);let u=[];for(let[n,r]of[[-4.5,8],[4.5,8],[-4.5,-8],[4.5,-8]]){let i=new V;i.position.set(n*e,10*e,r*e),i.add(Cc(a,e,4,10,4,t)),o.add(i),u.push(i)}let d=new yt(new ye(.1,.1,.18),new x({color:5913124}));return d.position.set(0,15*e,-14*e),o.add(d),{root:o,mat:t,parts:{body:s,head:c,legs:u,tail:d}}}function Dc(){let e=at({vertexColors:!0,emissive:new N(0)}),t=new W(22,34,18),n=(e,t,n)=>{let r=z(t/22,0,1);return Sc(v(2759752,5913746,r*.8+l(e,0,n,2)*.2),e,t,n,8,.06)};for(let e=4;e<22;e++){let r=(e-4)/18,i=3.2+r*3.8,a=2.6+r*2.4;for(let r=0;r<18;r++)for(let o=0;o<22;o++){let s=(o+.5-11)/i,c=(r+.5-9)/a,u=e<9?+(l(o,0,r,4)>.5):0;s*s+c*c<=1&&(e>8||l(o,e,r,11)>.12+(9-e)*.06)&&!(u&&e<7&&(o+r)%3==0)&&t.set(o,e,r,n(o,e,r))}}wc(t,11,26,9,5.8,6.2,5.6,(e,t,n)=>Sc(3811938,e,t,n,9,.07),9,.2);for(let e=7;e<=15;e++)for(let n=21;n<=28;n++){let r=(e-11)/4.4,i=(n-24.5)/4.2;r*r+i*i<=1&&t.set(e,n,14,656916)}for(let e of[8,13])t.box(e,25,14,e+2,27,15,7009535,!0),t.box(e,25,15,e+1,26,16,16777215,!0);t.box(10,33,8,12,34,10,6965928);for(let[e,n]of[[5,9],[17,9]])for(let r=22;r<31;r++)t.set(e-1+ +(e>10),r,n,Sc(3811938,r,n,3,3,.07));for(let e of[3,18]){t.box(e,12,8,e+1,20,10,(e,t,n)=>Sc(3811938,e,t,n,3,.07));for(let n=0;n<3;n++)t.box(e,8+n%2,7+n,e+1,12,8+n,14471412)}t.box(8,15,14,14,19,15,8014560,!0),t.box(9,16,15,13,18,16,14731519,!0);let r=new V,i=Cc(t,.06,11,0,9,e);return i.position.y=0,r.add(i),{root:r,body:i,mat:e,parts:{body:i}}}function Oc(){let e=.054,t=Me,n=at({vertexColors:!0,emissive:new N(0)}),r=m(t.scaleLo,.7),i=(e,n,r,i=3)=>{let a=l(e>>1,n>>1,r>>1,i),o=a>.74?t.scaleHi:a>.22?t.scale:t.scaleLo;return!(n&1)&&!(e+r&1)&&(o=m(o,.9)),Sc(o,e,n,r,i,.04)},a=(e,n,r)=>Sc(r&1?t.belly:t.bellyDark,e,n,r,5,.03),o=(e,n,r,i=0)=>Sc(i%3==2?t.hornDark:t.horn,e,n,r,6,.04),s=(e,t,n,r,i,a,o,s,c,l=.12)=>wc(e,t,n,r,i,a,o,s,c,l),c=new W(22,24,40);s(c,11,8.5,17,7.6,6.8,11.5,(e,t,n,r)=>t<=5&&r>.2?a(e,t,n):i(e,t,n),7,.15),s(c,11,12.5,27.5,4.4,5.2,4.4,(e,t,n)=>n>=29&&t<11?a(e,t,n):i(e,t,n),8),s(c,11,14.5,30.5,3.7,4.2,3.5,(e,t,n)=>t<12&&n>=31?a(e,t,n):i(e,t,n),9);for(let e of[5.2,16.8])s(c,e,7,8,3.6,5.2,5.4,i,10),s(c,e>11?17.2:4.8,8,23,3,4.6,4.4,i,11);for(let e=8;e<=31;e+=3){let t=-1;for(let n=23;n>=0;n--)if(c.has(10,n,e)){t=n;break}if(t<0)continue;let n=e>24?3:2;for(let r=1;r<=n;r++)for(let n of[10,11])c.set(n,t+r,e,o(n,t+r,e,r))}let u=new W(20,22,28);u.box(5,4,5,15,12,17,(e,t,n)=>i(e,t,n,12)),u.box(6,4,17,14,9,25,(e,t,n)=>i(e,t,n,13)),u.box(7,9,18,13,10,24,(e,t,n)=>i(e,t,n,14)),u.box(5,11,7,15,13,18,(e,t,n)=>Sc(r,e,t,n,15,.05));for(let e of[-1,1]){let n=t=>e<0?5+t:14-t;for(let[e,r]of[[0,9],[1,9],[2,9],[0,10],[1,10],[2,10]])u.set(n(e),r,16,e===1?t.pupil:t.eye,!0);u.set(n(0),11,17,r),u.set(n(1),11,17,r),u.set(n(2),11,17,r),u.set(n(2),10,17,r),u.set(n(3),10,17,r),u.set(n(3),9,17,m(r,.9)),u.set(n(2),7,25,1706506),u.set(n(2),8,25,1706506),u.set(n(1),3,23,t.tooth),u.set(n(1),2,23,t.tooth),u.set(n(1),1,23,t.tooth),u.set(n(2),3,20,t.tooth),u.set(n(2),2,20,t.tooth);let i=t=>e<0?4-t:15+t;for(let[e,t,n]of[[0,6,9],[1,6,9],[0,7,8],[0,5,10]])u.set(i(e),t,n,o(e,t,n,n));for(let t=0;t<10;t++){let n=10+e*(4.1+t*.22),r=t<5?2.4:t<8?1.6:.9,i=Math.round(12+t*.85),a=Math.round(9-t*.9);for(let e=Math.floor(n-r);e<=Math.ceil(n+r);e++)if(!(Math.abs(e+.5-n)>r/2+.01)){for(let n=0;n<(t<6?2:1);n++)u.set(e,i,a-n,o(e,i,a,t));t<5&&u.set(e,i+1,a,o(e,i+1,a,t))}}}for(let e=7;e<=15;e+=2){let t=e%4==3?3:2;for(let n=0;n<t;n++)for(let t of[9,10])u.set(t,13+n,e,o(t,13+n,e,n+2))}u.set(9,8,17,t.tooth);let d=new W(14,9,22);d.box(3,0,2,11,4,14,(e,t,n)=>t===0?a(e,t,n):i(e,t,n,16)),d.box(4,0,14,10,4,19,(e,t,n)=>t===0?a(e,t,n):i(e,t,n,17)),d.box(4,3,3,10,4,14,(e,n,r)=>Sc(t.mouth,e,n,r,3,.05)),d.box(6,3,5,8,4,12,(e,n,r)=>Sc(t.tongue,e,n,r,4,.05));for(let[e,n]of[[3,7],[10,7],[3,11],[10,11],[4,17],[9,17],[4,14],[9,14]])d.set(e,4,n,t.tooth),n>12&&d.set(e,5,n,t.tooth);d.set(5,4,18,t.tooth),d.set(8,4,18,t.tooth);let f=(e,n)=>{let a=e?10:8,o=new W(a,10,10),s=a/2;o.box(s-2.5,4,2,s+2.5,10,6,(e,t,r)=>i(e,t,r,n)),o.box(s-3.5,0,1,s+3.5,3,8,(e,t,r)=>i(e,t,r,n+1)),o.box(s-2.5,3,2,s+2.5,4,7,(e,t,i)=>Sc(r,e,t,i,n,.05));for(let e of[-3,-1,1]){let n=Math.round(s+e);o.set(n,0,8,t.claw),o.set(n,1,8,t.claw),o.set(n,0,9,t.claw)}return{model:o,cx:s}},p=new W(21,14,20),h=e=>9+6.5*Math.abs(Math.sin(e*.5))*(e/20)+e*.12,g=()=>2;for(let e=1;e<20;e++){let n=Math.round(7-e*.1),r=Math.round(h(e));for(let i=n;i<=r;i++)p.set(e,g(e),i,Sc(i>r-2?t.membraneHi:t.membrane,e,0,i,18,.05),!1)}let _=(e,t)=>{let n=Math.ceil(Math.hypot(e,t-8)*1.6);for(let i=0;i<=n;i++){let a=i/n,o=Math.round(a*e),s=Math.round(8+a*(t-8)),c=g(o);p.set(o,c,s,r),p.set(o,c+1,s,r)}};_(19,6);for(let e of[3,9,16])_(e,Math.round(h(e)));p.box(0,1,7,3,4,10,i);for(let e=0;e<3;e++)p.set(19,g(19)+1+e,5,t.claw);let v=(e,n,r,s,c)=>{let l=new W(e+4,n+4,r),u=(e+4)/2,d=(n+4)/2;for(let t=0;t<r;t++){let c=.6+.4*(t/(r-1)),f=e/2*c,p=n/2*c;for(let r=0;r<n+4;r++)for(let n=0;n<e+4;n++){let e=(n+.5-u)/f,o=(r+.5-d)/p;e*e+o*o<=1.02&&l.set(n,r,t,o<-.35?a(n,r,t):i(n,r,t,s))}if(t%3==1){let e=Math.round(d+p-.2);for(let n of[Math.floor(u)-1,Math.floor(u)])l.set(n,e,t,o(n,e,t,t))}}if(c)for(let e=0;e<5;e++){let n=3.4-e*.7;for(let r=Math.round(u-n);r<Math.round(u+n);r++)l.set(r,Math.floor(d),e,Sc(e===0?t.horn:t.scaleHi,r,0,e,19,.04))}return{model:l,cx:u,cy:d,len:r}},y=new V,b=new V;b.position.y=6*e,y.add(b);let x=Cc(c,e,11,0,17,n);b.add(x);let S=new V;S.position.set(0,16*e,16*e),S.add(Cc(u,e,10,5,6,n)),b.add(S);let C=new V;C.position.set(0,-1*e,0),C.add(Cc(d,e,7,4,2,n)),S.add(C);let w=[];for(let t of[-1,1]){let r=new V;r.position.set(t*5.4*e,13*e,4*e);let i=Cc(p,e,0,1,8,n);i.scale.x=t,r.add(i),r.rotation.z=t*.7,b.add(r),w.push(r)}let T=[],E=f(!1,21),D=f(!0,24);for(let[t,r,i]of[[-4.6,6.5,E],[4.6,6.5,E],[-5.4,-8.5,D],[5.4,-8.5,D]]){let a=new V;a.position.set(t*e,10*e,r*e),a.add(Cc(i.model,e,i.cx,10,3,n)),a.rotation.x=r>0?-.55:.6,y.add(a),T.push(a)}let ee=[],O=[v(8,8,10,30,!1),v(6,6,9,31,!1),v(4,4,8,32,!0)],k=b;return O.forEach((t,r)=>{let i=new V;i.position.set(0,r===0?7.5*e:0,r===0?-10*e:-(O[r-1].len-.5)*e),i.add(Cc(t.model,e,t.cx,t.cy,t.len,n)),k.add(i),k=i,ee.push(i)}),{root:y,mat:n,parts:{body:x,bodyG:b,head:S,jaw:C,legs:T,tail:ee,wings:w}}}function kc(){let e=at({vertexColors:!0,emissive:new N(0)}),t=new W(16,16,18),n=(e,t,n)=>{let r=l(e,t,n,12);return r>.7?16777215:r>.25?15921910:14277606};wc(t,8,6.5,8,5.4,4.6,6,n,6,.7);for(let e=0;e<18;e++){let n=l(e,1,1,5)*Math.PI*2,r=Math.round(8+Math.cos(n)*5.4),i=Math.round(8+Math.sin(n)*6),a=Math.round(5+l(e,2,1,5)*4);t.set(r,a,i,16777215)}for(let e=9;e<15;e++)t.box(7,e,2,9,e+1,4+ +(e>11),(e,t,n)=>t>11?16775920:15263984);wc(t,8,11,12.5,2.8,2.8,2.8,n,7,.4),t.box(7,10,15,9,12,17,16095786),t.box(7,13,11,9,15,13,14694970),t.set(6,11,14,1380378),t.set(10,11,14,1380378),t.box(6,0,7,7,3,8,16095786),t.box(9,0,7,10,3,8,16095786),t.box(5,0,6,8,1,10,16095786),t.box(8,0,6,11,1,10,16095786);let r=new V,i=Cc(t,.07,8,0,8,e);return r.add(i),{root:r,body:i,mat:e,parts:{body:i}}}function Ac(){let e=.072,t=at({vertexColors:!0,emissive:new N(0)}),n=(e,t,n)=>l(e>>1,t,n>>1,4)>.72?2893346:16250094,r=new W(18,14,28);r.box(2,4,4,16,12,24,n),r.box(3,12,6,15,13,22,n),r.box(6,2,16,12,5,22,15906500);let i=new W(14,12,14);i.box(2,3,2,12,10,10,n),i.box(4,4,10,10,7,13,15975088),i.box(5,5,12,6,6,13,2759704),i.box(8,5,12,9,6,13,2759704),i.set(5,7,11,1709074),i.set(9,7,11,1709074),i.box(3,10,4,5,13,6,15262420),i.box(9,10,4,11,13,6,15262420);let a=new W(6,10,6);a.box(1,2,1,5,10,5,n),a.box(1,0,1,5,2,5,2761760);let o=new V,s=Cc(r,e,9,4,14,t);o.add(s);let c=Cc(i,e,7,6,2,t);c.position.set(0,8*e,12*e),o.add(c);let u=[];for(let[n,r]of[[-5,6],[5,6],[-5,-6],[5,-6]]){let i=new V;i.position.set(n*e,0,r*e),i.add(Cc(a,e,3,0,3,t)),o.add(i),u.push(i)}let d=new W(4,10,4);d.box(1,1,1,3,9,3,2893346),d.box(0,0,0,4,2,4,16250094);let f=new V;return f.position.set(0,9*e,-10*e),f.add(Cc(d,e,2,8,2,t)),o.add(f),{root:o,body:s,mat:t,parts:{body:s,head:c,legs:u,tail:f}}}function jc(e){let t=.045,n=new W(8,2,8);for(let t=0;t<7;t++)for(let r=0;r<7;r++)Math.hypot(r-.5,(t-3)*.9)<5.2&&n.set(r,0,t,l(r,t,1,3)>.8?m(e,.7):(r+t)%5==0?16777215:e);let r=new a({vertexColors:!0,side:2}),i=n.build(t,0,0,3.5),o=new V,s=new V,c=new V,u=e=>{let t=new yt(i.solid,r);return t.scale.x=e,t};s.add(u(1)),c.add(u(-1)),o.add(s,c);let d=new W(2,2,6);d.box(0,0,0,1,1,6,2759188);let f=new yt(d.build(t,.5,.5,3).solid,r);return o.add(f),{root:o,wingL:s,wingR:c}}var Mc=.05,X={s0:1250075,s1:1908008,s2:2697527,s3:3816013,b0:2302256,b1:3223362,m0:4004474,m1:5909678,m2:8143570,m3:10643184,c0:2910397,c1:5019624,c2:8832255,c3:13035263,glow:3837183,glowHi:11854079,claw:10131622,clawHi:14210786,mouth:1378854,mouthGlow:4879600,tooth:13684444},Nc=(e,t,n,r,i=0,a=.04)=>U(e,a,l(t,n,r,i));function Pc(e,t,n,r,i){let o=e.build(Mc,t,n,r),s=new V;if(o.solid){let e=new yt(o.solid,i);e.castShadow=!0,s.add(e)}return o.glow&&s.add(new yt(o.glow,new a({vertexColors:!0}))),s}var Fc=(e,t,n,r=3)=>{let i=l(e>>1,t>>1,n>>1,r),a=i>.84?X.s3:i>.46?X.s2:i>.12?X.s1:X.s0;return n%4==0?a=m(a,.76):t%3==0&&!(e&1)&&(a=m(a,.9)),Nc(a,e,t,n,r,.035)},Ic=(e,t,n)=>Nc(n>>1&1?X.b1:X.b0,e,t,n,5,.03),Lc=(e,t,n)=>Nc(t&1?X.b1:X.b0,e,t,n,6,.03),Rc=(e,t=0,n=0,r=0)=>Nc(e<.28?X.c0:e<.58?X.c1:e<.86?X.c2:X.c3,t,n,r,7,.03);function zc(e,t,n,r,i,a,o,s,c=1,u=.18,d=-99){for(let f=Math.floor(r-o-1);f<=Math.ceil(r+o+1);f++)for(let p=Math.floor(n-a-1);p<=Math.ceil(n+a+1);p++)for(let m=Math.floor(t-i-1);m<=Math.ceil(t+i+1);m++){if(p<d)continue;let h=(m+.5-t)/i,g=(p+.5-n)/a,_=(f+.5-r)/o,v=h*h+g*g+_*_;v<=1+(l(m,p,f,c)-.5)*u&&e.set(m,p,f,typeof s==`function`?s(m,p,f,v,h,g,_):s)}}function Bc(e,t,n,r,i,a,o,s,c,l=0,u=!1){let d=Math.ceil(Math.hypot(i-t,a-n,o-r)*2.2);for(let f=0;f<=d;f++){let p=d===0?0:f/d,m=Math.max(1,Math.round(s*(1-l*p))),h=t+(i-t)*p,g=n+(a-n)*p,_=r+(o-r)*p,v=Math.round(h-m/2+.5),y=Math.round(g-m/2+.5),b=Math.round(_-m/2+.5);for(let t=0;t<m;t++)for(let n=0;n<m;n++)for(let r=0;r<m;r++){let i=typeof c==`function`?c(p,v+t,y+n,b+r):c;if(i==null)continue;let a=typeof u==`function`?u(p):u;e.set(v+t,y+n,b+r,i,a)}}}function Vc(e,t,n){for(let r=e.sz-1;r>=0;r--)if(e.has(t,n,r))return r;return-1}function Hc(e,t,n){for(let r=e.sy-1;r>=0;r--)if(e.has(t,r,n))return r;return-1}function Uc(e,t,n,r,i,a=.6,o=2,s=0){for(let c=1;c<=i;c++){let l=r-Math.floor(c*a),u=t+Math.floor(c*s),d=Rc(c/i,u,n+c,l),f=c===i;e.set(u,n+c,l,d,f||c>i-1),c<=Math.ceil(i*.55)&&o>1&&e.set(u-1,n+c,l,Rc(c/i,u-1,n+c,l))}}var Wc={x:14,y:4,z:21};function Gc(){let e=new W(30,40,58),t=(e,t,n)=>(e,t,r,i,a,o)=>o<-.42?Ic(e,t,r):Fc(e,t,r,n);zc(e,14,10,9.5,6.7,5.9,8.5,t(10,5.8,7),7,.16),zc(e,14,10.5,17,7.4,6.4,9,t(10,6,8),8,.16),zc(e,14,12,26.5,8.2,7.4,7.8,t(12,7,9),9,.16);for(let t of[-1,1])zc(e,14+t*6.6,8.4,10.5,3.7,4.9,5.6,Fc,21,.2),zc(e,14+t*6.4,14.2,25.5,3.4,3.8,4.4,Fc,22,.2);for(let[t,n,r,i,a,o]of[[15.5,33.2,4.7,4.9,4.3,10],[19.5,36.8,4.1,4.3,3.9,11],[23.5,39.8,3.7,3.9,3.7,12],[27,42.6,3.4,3.7,3.5,13]])zc(e,14,t,n,r,i,a,(e,t,n,r,i,a,s)=>s>.4?Lc(e,t,n):Fc(e,t,n,o),o,.14);for(let t=4;t<=43;t+=2){let n=Hc(e,14,t);if(n<0)continue;let r=t>32?3:4+Math.round(1.4*Math.sin(t*.45));Uc(e,14,n,t,r,.65,t>32?1:2)}for(let t of[-1,1])Bc(e,14+t*7.4,17,26,14+t*11.5,23,20,3,(e,t,n,r)=>e>.75?Rc(.9,t,n,r):Fc(t,n,r,31),.66),Bc(e,14+t*6,12,34,14+t*9.5,14,30,2,(e,t,n,r)=>Fc(t,n,r,32),.5);let n=[];for(let t=-5;t<=5;t++)for(let r=-4;r<=4;r++){let i=(r/3.6)**2+(t/4.6)**2;if(i>1)continue;let a=14+r,o=Math.round(10.5+t),s=Vc(e,a,o);s<0||n.push([a,o,s,i])}for(let[t,r,i,a]of n){let n=a<.18?X.glowHi:a<.55?X.glow:X.c0;e.set(t,r,i,n,!0),a<.62&&e.set(t,r,i+1,a<.25?X.glowHi:X.c1,!0)}let r=new Kt(77);for(let t=0;t<6;t++){let t=14+r.int(-2,2),n=11+r.int(-3,3),i=r.int(0,3);for(let a=0;a<8;a++){let o=Vc(e,t,n);o>=0&&!e.get(t,n,o+1)&&e.set(t,n,o,a<3?X.glow:X.c0,!0),i===0?t+=1:i===1?--t:i===2?--n:n+=r.chance(.5)?1:-1,r.chance(.4)&&(i=r.int(0,3))}}for(let t of[-1,1])for(let n=13;n<=27;n+=3){let r=14+t*7;e.set(r,9,n,X.glow,!0)}return e}var Kc={x:15,y:8,z:10};function qc(){let e=new W(32,42,44),t=e=>(t,n,r,i,a,o)=>o<-.5?Nc(X.s0,t,n,r,e,.03):Fc(t,n,r,e);zc(e,15,13,15,7.6,6.4,8.4,t(40),40,.14),zc(e,15,11.4,24,5.6,4.4,6.6,t(41),41,.14,7),zc(e,15,10.6,30.5,4.5,3.6,5,t(42),42,.12,7),zc(e,15,10,35.5,3.6,3.1,4,t(43),43,.1,7),zc(e,15,10.4,38.6,2.8,2.7,1.9,t(44),44,.08,7);for(let t of[-1,1])zc(e,15+t*4.6,17.4,21,3.1,1.9,3.4,(e,t,n)=>Nc(X.s0,e,t,n,45,.03),45,.1),zc(e,15+t*2.6,13.4,36.2,1.2,1.1,1.3,(e,t,n)=>Nc(460555,e,t,n,46,.02),46,0);for(let t of[-1,1]){let n=e=>15+t*e-+(t<0);for(let t=0;t<2;t++)for(let r=0;r<3;r++){let i=n(3+r),a=14+t,o=Vc(e,i,a);if(o<0)continue;let s=r===1&&t===0;e.set(i,a,o,s?X.glowHi:r===2&&t===1?X.c0:X.glow,!0)}for(let t=0;t<4;t++){let r=n(2+t),i=Vc(e,r,16);i>=0&&e.set(r,16,i,m(X.s0,.8))}Bc(e,15+t*7,15,15,15+t*13,18,5,3,(e,t,n,r)=>e>.8?Rc(.5,t,n,r):Fc(t,n,r,47),.7),Bc(e,15+t*7.4,11,12,15+t*11.5,7,5,2,(e,t,n,r)=>Fc(t,n,r,48),.5),Bc(e,15+t*7.2,9,18,15+t*10.5,5,13,2,(e,t,n,r)=>Fc(t,n,r,49),.5);let r=[[15+t*2.6,18,12],[15+t*5,23,10],[15+t*8.2,29,6],[15+t*10.6,36,2]];for(let t=0;t<r.length-1;t++){let n=r[t],i=r[t+1];Bc(e,n[0],n[1],n[2],i[0],i[1],i[2],3-Math.floor(t/2),(e,n,r,i)=>Rc((t+e)/3,n,r,i),.3,e=>t===2&&e>.85)}for(let[n,i,a,o,s]of[[1,.2,7.2,4.4,5.6],[1,.65,11.2,4.6,6],[2,.1,12,5.2,8],[2,.6,15.8,5,7]]){let c=r[n],l=r[n+1],u=c[0]+(l[0]-c[0])*i,d=c[1]+(l[1]-c[1])*i,f=c[2]+(l[2]-c[2])*i;Bc(e,u,d,f,u+t*(a-6)*.45,d+s,f+o*.6,2,(e,t,n,r)=>Rc(.35+e*.65,t,n,r),.5,e=>e>.85)}Bc(e,15+t*1.6,18,7,15+t*2,25,3,2,(e,t,n,r)=>Rc(.3+e*.6,t,n,r),.5,e=>e>.85)}for(let t=6;t<=14;t+=3){let n=Hc(e,15,t);n>=0&&Uc(e,15,n,t,3,.8,1)}for(let t of[-1,1])for(let n of[22,25,28.5,32,35]){let r=15+t*(n<30?4.4:3.2)-(t<0),i=n===32;for(let t=0;t<(i?3:1);t++)e.set(r,6-t,Math.floor(n),t===(i?2:0)?X.clawHi:m(X.tooth,.85))}for(let t=17;t<=36;t++)for(let n=12;n<=17;n++)e.has(n,7,t)&&e.set(n,6,t,Nc(X.mouth,n,6,t,50,.03));return e}function Jc(){let e=new W(18,12,30),t=e=>(t,n,r,i,a,o)=>o<-.2?Ic(t,n,r):Fc(t,n,r,e);zc(e,9,4,8,5.4,2.6,7.4,t(51),51,.12),zc(e,9,3.6,15.5,4.3,2.3,5.2,t(52),52,.12),zc(e,9,3.2,21.5,3.2,2.1,4.4,t(53),53,.1),zc(e,9,2.8,26,2.3,1.8,2.3,t(54),54,.1);for(let t=5;t<=24;t++)for(let n=6;n<=11;n++)(e.has(n,5,t)||e.has(n,4,t))&&e.set(n,5,t,Nc(X.mouth,n,5,t,55,.03));for(let t=7;t<=20;t++)e.set(8+(t&1),5,t,X.mouthGlow,!0);for(let t of[-1,1]){for(let n of[9,12.5,16,19.5,23]){let r=9+t*(n<18?4:2.6)-(t<0),i=n===23;for(let t=0;t<(i?3:1);t++)e.set(r,6+t,Math.floor(n),t===(i?2:0)?X.clawHi:m(X.tooth,.85))}Bc(e,9+t*5,2,6,9+t*8,1,1,2,(e,t,n,r)=>Rc(.2+e*.7,t,n,r),.6,e=>e>.8)}return e}function Yc(e,t){let n=new W(e,16,16),r=e/2;return zc(n,r,9.4,8,5,5.8,5.6,Fc,t,.16),zc(n,r,13,8,3.6,2.6,4.2,Fc,t+1,.16),zc(n,r,3.4,7,3.2,2.6,3.4,Fc,t+2,.12),Bc(n,r,4.2,4.5,r,3,.8,2,(e,t,n,r)=>Rc(.2+e*.7,t,n,r),.5),n}function Xc(e,t){let n=new W(e,20,26),r=e/2;zc(n,r,14.6,7,3.4,5.4,3.6,Fc,t,.14),zc(n,r,8.4,9.2,3.1,2.6,3.4,Fc,t+1,.12),zc(n,r,3.6,12.6,3.8,2.3,5.4,Fc,t+2,.12);for(let e of[-3,0,3]){let i=r+e;Bc(n,i,2.6,14,i+e*.3,1.6,19,2,(e,n,r,i)=>Fc(n,r,i,t+3),.2);let a=Math.round(i+e*.3);n.set(a,1,20,X.claw),n.set(a,1,21,X.claw),n.set(a,0,22,X.clawHi),n.set(a,0,23,X.clawHi),n.set(a,0,24,X.tooth)}return Bc(n,r,5.2,6,r,2.2,3,2,e=>e>.5?X.claw:Fc(r,4,5,t+4),.5),n}var Zc=4,Qc=17,$c=14,el=21;function tl(){let e=new W(19,8,40),t=new W(34,8,40),n=(n,r,i,a,o=!1)=>{let s=i+Zc;s<0||s>=40||(n<Qc?e.set(n,r,s,a,o):t.set(n-Qc,r,s,a,o))},r=(n,r,i)=>n<Qc?e.has(n,r,i+Zc):t.has(n-Qc,r,i+Zc),i=[[0,4],[20,-2],[31,3],[41,12],[48,28]],a=e=>{for(let t=0;t<i.length-1;t++){let[n,r]=i[t],[a,o]=i[t+1];if(e>=n&&e<=a){let s=(e-n)/Math.max(1,a-n),c=Math.hypot(a-n,o-r),l=t===0?0:Math.sin(s*Math.PI)*c*.2;return r+(o-r)*s+l*(t===i.length-2?.2:1)}}return 28},o=e=>e<=Qc?$c+e/Qc*7+Math.sin(e/Qc*Math.PI)*1.6:el+((e-Qc)/31)**1.35*7.4,s=[[Qc,el,48,28],[Qc,el,41,12],[Qc,el,31,3],[Qc,el,20,-2]],c=(e,t)=>{let n=99;for(let[r,i,a,o]of s){let s=a-r,c=o-i,l=z(((e-r)*s+(t-i)*c)/(s*s+c*c),0,1);n=Math.min(n,Math.hypot(e-(r+l*s),t-(i+l*c)))}return n=Math.min(n,Math.hypot(e-Qc,t-el)*.8),n};for(let e=1;e<=47;e++){let t=Math.ceil(a(e)),r=Math.floor(o(e))-+(e>Qc);for(let i=t;i<=r;i++){let a=c(e+.5,i+.5),o=(i-t)/Math.max(1,r-t),s=l(e>>1,0,i>>1,71),u=l(e,0,i,72),d=.18+z(a/7,0,1)*.5+(s-.5)*.55+(u-.5)*.14+(1-o)*.08;d=z(d,0,.999);let f=[X.m0,X.m1,X.m2,X.m3][Math.floor(d*4)];n(e,2,i,Nc(f,e,0,i,73,.03))}}let u=(e,t,n,r)=>e>.85?Nc(X.s3,t,n,r,74):Fc(t,n,r,75),d=(e,t,r,i,a,o)=>{let s=Math.ceil(Math.hypot(r-e,i-t)*2.2);for(let c=0;c<=s;c++){let l=c/s,d=Math.max(1,Math.round(a*(1-o*l))),f=Math.round(e+(r-e)*l-d/2+.5),p=Math.round(t+(i-t)*l-d/2+.5);for(let e=0;e<d;e++)for(let t=0;t<d;t++)for(let r=2;r<2+Math.max(2,d);r++)n(f+e,r,p+t,u(l,f+e,r,p+t))}};d(0,$c,8,18,4,.2),d(8,18,Qc,el,3,0),d(Qc,el,48,28,3,.7),d(Qc,el,41,12,2,.5),d(Qc,el,31,3,2,.5),d(Qc,el,20,-2,2,.5),d(2,5,12,9,2,.4),d(0,8,14,12,1,0);for(let[e,t,n,r]of s){let i=n-e,a=r-t,o=Math.hypot(i,a);d(n,r,n+i/o*3,r+a/o*3,2,.8)}for(let e=0;e<7;e++){let t=20+e*4,r=Math.round(o(t));for(let e=0;e<2;e++)n(t,3+e,r,Nc(X.s3,t,e,r,76))}Bc(e,7,2,22,5,4,28,3,(e,t,n,r)=>Fc(t,n,r,77),.7),d(Qc,el,20,29,3,.8);for(let e=0;e<4;e++)n(18+ +(e>1),3,24+e*2,X.clawHi);let f=new Kt(808);for(let e=0;e<40;e++){let e=f.int(19,44),t=f.int(Math.ceil(a(e))+1,Math.floor(o(e))-2);r(e,2,t)&&c(e,t)>3&&n(e,2,t,X.m3,!1)}return{inner:e,outer:t}}function nl(e,t,n,r,i){let a=new W(e+4,t+4+i,n),o=(e+4)/2,s=(t+4)/2;for(let c=0;c<n;c++){let l=.62+.38*(c/(n-1)),u=e/2*l,d=t/2*l;for(let n=0;n<t+4;n++)for(let t=0;t<e+4;t++){let e=(t+.5-o)/u,i=(n+.5-s)/d;e*e+i*i<=1.02&&a.set(t,n,c,i<-.38?Ic(t,n,c):Fc(t,n,c,r))}if(c%3==1){let e=Math.round(s+d-.3);Uc(a,Math.floor(o),e,c,i,.8,2),Uc(a,Math.floor(o)-1,e,c,Math.max(1,i-2),.8,1)}}return{model:a,cx:o,cy:s,len:n}}function rl(){let e=new W(26,28,30);for(let t=29;t>=23;t--){let n=.5-(29-t)*.03;for(let r=0;r<24;r++)for(let i=0;i<26;i++){let a=(i+.5-13)/(2.6*n+1),o=(r+.5-11)/(2.6*n+1);a*a+o*o<=1&&e.set(i,r,t,o<-.4?Ic(i,r,t):Fc(i,r,t,80))}}for(let[t,n,r,i]of[[0,0,22,3],[1,0,17,2],[-1,0,17,2],[0,1,13,2],[0,-1,11,2],[1,.7,14,2],[-1,.7,14,2],[1,-.7,9,1],[-1,-.7,9,1]]){let a=t*.55,o=n*.6;Bc(e,13,11,23,13+a*r*.55,11+o*r*.55,23-r,i,(e,t,n,r)=>Rc(.15+e*.85,t,n,r),.7,e=>e>.8)}return{model:e,cx:13,cy:11,len:30}}function il(){let e=at({vertexColors:!0,emissive:new N(0)}),t=new V,n=new V;n.position.y=7*Mc,t.add(n);let r=Pc(Gc(),Wc.x,Wc.y,Wc.z,e);n.add(r);let i=new V;i.position.set(0,(27-Wc.y)*Mc,(42.8-Wc.z)*Mc),i.scale.setScalar(.86),i.add(Pc(qc(),Kc.x,Kc.y,Kc.z,e)),n.add(i);let a=new V;a.position.set(0,-1.4*Mc,4*Mc),a.add(Pc(Jc(),9,4,3,e)),i.add(a);let{inner:o,outer:s}=tl(),c=[],l=[];for(let t of[-1,1]){let r=new V;r.position.set(t*7.4*Mc,(16.4-Wc.y)*Mc,(25-Wc.z)*Mc);let i=Pc(o,0,2,18,e);i.scale.x=t,r.add(i);let a=new V;a.position.set(t*Qc*Mc,0,7*Mc);let u=Pc(s,0,2,25,e);u.scale.x=t,a.add(u),r.add(a),a.rotation.z=t*-.12,r.rotation.z=t*.45,n.add(r),c.push(r),l.push(a)}let u=[],d=[],f=[Yc(12,90),Yc(14,95)],p=[Xc(12,100),Xc(14,105)];[[-6.8,25,0],[6.8,25,0],[-7.2,10,1],[7.2,10,1]].forEach(([t,r,i],a)=>{let o=new V;o.position.set(t*Mc,(8.6-Wc.y)*Mc,(r-Wc.z)*Mc),o.scale.setScalar(.84);let s=i?14:12;o.add(Pc(f[i],s/2,12,8,e));let c=new V;c.position.y=-9*Mc;let l=Pc(p[i],s/2,16,6,e);c.add(l),o.add(c),o.rotation.x=i?.45:-.55,c.rotation.x=i?-.7:.85,n.add(o),u.push(o),d.push(c)});let m=[],h=[nl(10,10,11,30,5),nl(8,8,11,31,4),nl(7,7,10,32,4),nl(5,5,10,33,3),rl()],g=n;return h.forEach((t,n)=>{let r=new V;r.position.set(0,n===0?(8-Wc.y)*Mc:0,n===0?(3-Wc.z)*Mc:-(h[n-1].len-.5)*Mc),r.add(Pc(t.model,t.cx,t.cy,t.len,e)),g.add(r),g=r,m.push(r)}),{root:t,mat:e,parts:{body:r,bodyG:n,head:i,jaw:a,legs:u,knees:d,tail:m,wings:c,wingsOuter:l}}}var al=.05,Z={s0:1052692,s1:1710624,s2:2631728,s3:3947590,b0:1314316,b1:2364944,m0:3807344,m1:6039716,m2:9062096,m3:12615920,c0:4860624,c1:6965486,c2:9728255,c3:13680895,glow:16734738,glowHi:16769162,claw:13157564,clawHi:16052456,mouth:1705988,mouthGlow:16738840,tooth:15262940},ol=(e,t,n,r,i=0,a=.04)=>U(e,a,l(t,n,r,i));function sl(e,t,n,r,i){let o=e.build(al,t,n,r),s=new V;if(o.solid){let e=new yt(o.solid,i);e.castShadow=!0,s.add(e)}return o.glow&&s.add(new yt(o.glow,new a({vertexColors:!0}))),s}var cl=(e,t,n,r=3)=>{let i=l(e>>1,t>>1,n>>1,r);if(l(e,t,n,r+11)>.972)return l(e,n,t,r)>.45?Z.glowHi:Z.glow;let a=i>.84?Z.s3:i>.46?Z.s2:i>.12?Z.s1:Z.s0;return n%4==0?a=m(a,.76):t%3==0&&!(e&1)&&(a=m(a,.9)),ol(a,e,t,n,r,.035)};function ll(e){let t=e=>{let t=e>>16&255,n=e>>8&255,r=e&255;return t>180&&n>40&&n<230&&r<90&&t>n+40};for(let n=0;n<e.sz;n++)for(let r=0;r<e.sy;r++)for(let i=0;i<e.sx;i++){let a=e.get(i,r,n);a&&t(a&16777215)&&(e.has(i+1,r,n)&&e.has(i-1,r,n)&&e.has(i,r+1,n)&&e.has(i,r-1,n)&&e.has(i,r,n+1)&&e.has(i,r,n-1)||e.set(i,r,n,a&16777215,!0))}}var ul=(e,t,n)=>ol(n>>1&1?Z.b1:Z.b0,e,t,n,5,.03),dl=(e,t,n)=>ol(t&1?Z.b1:Z.b0,e,t,n,6,.03),fl=(e,t=0,n=0,r=0)=>ol(e<.28?Z.c0:e<.58?Z.c1:e<.86?Z.c2:Z.c3,t,n,r,7,.03);function pl(e,t,n,r,i,a,o,s,c=1,u=.18,d=-99){for(let f=Math.floor(r-o-1);f<=Math.ceil(r+o+1);f++)for(let p=Math.floor(n-a-1);p<=Math.ceil(n+a+1);p++)for(let m=Math.floor(t-i-1);m<=Math.ceil(t+i+1);m++){if(p<d)continue;let h=(m+.5-t)/i,g=(p+.5-n)/a,_=(f+.5-r)/o,v=h*h+g*g+_*_;v<=1+(l(m,p,f,c)-.5)*u&&e.set(m,p,f,typeof s==`function`?s(m,p,f,v,h,g,_):s)}}function ml(e,t,n,r,i,a,o,s,c,l=0,u=!1){let d=Math.ceil(Math.hypot(i-t,a-n,o-r)*2.2);for(let f=0;f<=d;f++){let p=d===0?0:f/d,m=Math.max(1,Math.round(s*(1-l*p))),h=t+(i-t)*p,g=n+(a-n)*p,_=r+(o-r)*p,v=Math.round(h-m/2+.5),y=Math.round(g-m/2+.5),b=Math.round(_-m/2+.5);for(let t=0;t<m;t++)for(let n=0;n<m;n++)for(let r=0;r<m;r++){let i=typeof c==`function`?c(p,v+t,y+n,b+r):c;if(i==null)continue;let a=typeof u==`function`?u(p):u;e.set(v+t,y+n,b+r,i,a)}}}function hl(e,t,n){for(let r=e.sz-1;r>=0;r--)if(e.has(t,n,r))return r;return-1}function gl(e,t,n){for(let r=e.sy-1;r>=0;r--)if(e.has(t,r,n))return r;return-1}function _l(e,t,n,r,i,a=.6,o=2,s=0){for(let c=1;c<=i;c++){let l=r-Math.floor(c*a),u=t+Math.floor(c*s),d=fl(c/i,u,n+c,l),f=c===i;e.set(u,n+c,l,d,f||c>i-1),c<=Math.ceil(i*.55)&&o>1&&e.set(u-1,n+c,l,fl(c/i,u-1,n+c,l))}}var vl={x:14,y:4,z:21};function yl(){let e=new W(30,40,58),t=(e,t,n)=>(e,t,r,i,a,o)=>o<-.42?ul(e,t,r):cl(e,t,r,n);pl(e,14,10,9.5,6.7,5.9,8.5,t(10,5.8,7),7,.16),pl(e,14,10.5,17,7.4,6.4,9,t(10,6,8),8,.16),pl(e,14,12,26.5,8.2,7.4,7.8,t(12,7,9),9,.16);for(let t of[-1,1]){pl(e,14+t*6.6,8.4,10.5,3.7,4.9,5.6,cl,21,.2),pl(e,14+t*6.4,14.2,25.5,3.4,3.8,4.4,cl,22,.2),pl(e,14+t*8.8,17.2,25.4,3.2,3.7,4.8,(e,t,n,r,i,a,o)=>a>.25&&Math.abs(o)<.45&&l(e,t,n,116)>.62?Z.glow:cl(e,t,n,116),116,.12),ml(e,14+t*8.6,18,28,14+t*10.5,15,23,2,(e,t,n,r)=>e>.72?Z.glowHi:Z.glow,.45,!0);for(let n=0;n<3;n++){let r=14+n*5;ml(e,14+t*2.2,6+n*1.5,r,14+t*5.8,8+n*1.3,r+1,2,(e,t,r,i)=>cl(t,r,i,117+n),.55)}}for(let t=4;t<=30;t+=2){let n=gl(e,14,t);if(n<0)continue;let r=t>28?5:7+Math.round(Math.sin(t*.45));_l(e,14,n,t,r,.55,2),_l(e,15,n-1,t,Math.max(3,r-3),.55,1)}for(let t of[-1,1])ml(e,14+t*7.4,17,26,14+t*11.5,23,20,3,(e,t,n,r)=>e>.75?fl(.9,t,n,r):cl(t,n,r,31),.66),ml(e,14+t*6,12,34,14+t*9.5,14,30,2,(e,t,n,r)=>cl(t,n,r,32),.5);let n=(t,n,r)=>{let i=Math.round(t),a=Math.round(n),o=hl(e,i,a);o<0||(e.set(i,a,o,r,!0),o+1<e.sz&&e.set(i,a,o+1,r,!0))};for(let e=6;e<=15;e++)n(14,e,e>=11&&e<=13?Z.glowHi:Z.glow);for(let e=1;e<=7;e++){let t=12+e*.65;n(14+e*.72,t,e<3?Z.glowHi:Z.glow),n(14-e*.72,t,e<3?Z.glowHi:Z.glow)}let r=new Kt(77);for(let t=0;t<6;t++){let t=14+r.int(-2,2),n=11+r.int(-3,3),i=r.int(0,3);for(let a=0;a<8;a++){let o=hl(e,t,n);o>=0&&!e.get(t,n,o+1)&&e.set(t,n,o,a<3?Z.glowHi:Z.glow,!0),i===0?t+=1:i===1?--t:i===2?--n:n+=r.chance(.5)?1:-1,r.chance(.4)&&(i=r.int(0,3))}}for(let t of[-1,1])for(let n=13;n<=27;n+=3){let r=14+t*7;e.set(r,9,n,Z.glow,!0)}ml(e,14,8,14,14,18,38,2,e=>e>.62?Z.glowHi:Z.glow,.25,!0),ml(e,14,11,16,14,22,34,1,()=>Z.glowHi,.35,!0);for(let t of[-1,1])ml(e,14+t*2,9,18,14+t*4,16,32,1,()=>Z.glow,.4,!0);return ll(e),e}function bl(){let e=new W(30,40,58),t=[[15.5,33.2,4.7,4.9,4.3,10],[19.5,36.8,4.1,4.3,3.9,11],[23.5,39.8,3.7,3.9,3.7,12],[27,42.6,3.4,3.7,3.5,13]];for(let[n,r,i,a,o,s]of t)pl(e,14,n,r,i,a,o,(e,t,n,r,i,a,o)=>o>.4?dl(e,t,n):cl(e,t,n,s),s,.14);for(let t of[-1,1])for(let n=0;n<5;n++){let r=31+n*3,i=18+n*2.2;pl(e,14+t*(4-n*.16),i,r,1.45,2.25,2.2,(e,t,r)=>cl(e,t,r,130+n),130+n,.08),n%2==0&&ml(e,14+t*4.4,i+1,r+1,14+t*4.9,i-.8,r-1,1,()=>Z.glow,.25,!0)}for(let[n,r,i]of t){let t=Math.round(n),a=Math.round(r);for(let n=Math.round(14-i);n<=Math.round(14+i);n++)e.has(n,t,a)&&e.set(n,t,a,n+a&1?Z.glowHi:Z.glow,!0),e.has(n,t,a+1)&&e.set(n,t,a+1,Z.glow,!0)}return e}var xl={x:15,y:8,z:10};function Sl(){let e=new W(32,42,44),t=e=>(t,n,r,i,a,o)=>o<-.5?ol(Z.s0,t,n,r,e,.03):cl(t,n,r,e);pl(e,15,13,15,7.6,6.4,8.4,t(40),40,.14),pl(e,15,11.4,24,5.6,4.4,6.6,t(41),41,.14,7),pl(e,15,10.6,30.5,4.5,3.6,5,t(42),42,.12,7),pl(e,15,10,35.5,3.6,3.1,4,t(43),43,.1,7),pl(e,15,10.4,38.6,2.8,2.7,1.9,t(44),44,.08,7),pl(e,15,10.1,41.4,2,2.1,1.5,t(44),144,.08,8);for(let t of[-1,1])pl(e,15+t*4.6,17.4,21,3.1,1.9,3.4,(e,t,n)=>ol(Z.s0,e,t,n,45,.03),45,.1),pl(e,15+t*2.6,13.4,36.2,1.2,1.1,1.3,(e,t,n)=>ol(460555,e,t,n,46,.02),46,0);for(let t of[-1,1]){let n=e=>15+t*e-+(t<0);for(let t=0;t<3;t++){let r=n(3+t),i=hl(e,r,15);i<0||(e.set(r,15,i,t===1?Z.glowHi:Z.glow,!0),e.set(r,15,i+1,Z.glow,!0))}for(let t=0;t<4;t++){let r=n(2+t),i=hl(e,r,16);i>=0&&e.set(r,16,i,m(Z.s0,.8))}ml(e,15+t*7,15,15,15+t*13,18,5,3,(e,t,n,r)=>e>.8?fl(.5,t,n,r):e<.25?Z.glow:cl(t,n,r,47),.7,e=>e<.25),ml(e,15+t*7.4,11,12,15+t*11.5,7,5,2,(e,t,n,r)=>cl(t,n,r,48),.5),ml(e,15+t*7.2,9,18,15+t*10.5,5,13,2,(e,t,n,r)=>cl(t,n,r,49),.5);let r=[[15+t*2.4,16,16],[15+t*5.2,19,9],[15+t*8,21,3],[15+t*10.2,18,-1]];for(let t=0;t<r.length-1;t++){let n=r[t],i=r[t+1];ml(e,n[0],n[1],n[2],i[0],i[1],i[2],3-Math.floor(t/2),(e,n,r,i)=>fl((t+e)/3,n,r,i),.3,e=>t===2&&e>.85)}for(let[n,i,a,o,s]of[[1,.35,6,3,3.2],[2,.4,8,3.2,3.6]]){let c=r[n],l=r[n+1],u=c[0]+(l[0]-c[0])*i,d=c[1]+(l[1]-c[1])*i,f=c[2]+(l[2]-c[2])*i;ml(e,u,d,f,u+t*(a-6)*.45,d+s,f+o*.6,2,(e,t,n,r)=>fl(.35+e*.65,t,n,r),.5,e=>e>.85)}ml(e,15+t*1.4,16,10,15+t*3.2,20,2,2,(e,t,n,r)=>fl(.3+e*.6,t,n,r),.5,e=>e>.85)}for(let t=6;t<=14;t+=3){let n=gl(e,15,t);n>=0&&_l(e,15,n,t,t===9?7:5,.7,2)}for(let t of[-1,1])for(let n of[22,25,28.5,32,35]){let r=15+t*(n<30?4.4:3.2)-(t<0),i=n===32;for(let t=0;t<(i?3:1);t++)e.set(r,6-t,Math.floor(n),t===(i?2:0)?Z.clawHi:m(Z.tooth,.85))}for(let t=17;t<=36;t++)for(let n=12;n<=17;n++)e.has(n,7,t)&&e.set(n,6,t,ol(Z.mouth,n,6,t,50,.03));return ll(e),e}function Cl(){let e=new W(18,12,30),t=e=>(t,n,r,i,a,o)=>o<-.2?ul(t,n,r):cl(t,n,r,e);pl(e,9,4,8,5.4,2.6,7.4,t(51),51,.12),pl(e,9,3.6,15.5,4.3,2.3,5.2,t(52),52,.12),pl(e,9,3.2,21.5,3.2,2.1,4.4,t(53),53,.1),pl(e,9,2.8,26,2.3,1.8,2.3,t(54),54,.1);for(let t=5;t<=24;t++)for(let n=6;n<=11;n++)(e.has(n,5,t)||e.has(n,4,t))&&e.set(n,5,t,ol(Z.mouth,n,5,t,55,.03));for(let t=7;t<=20;t++)e.set(8+(t&1),5,t,Z.mouthGlow,!0);for(let t=0;t<3;t++){let n=27+t;e.set(9,5,n,t===1?Z.glowHi:Z.glow,!0),e.set(8,4,n,Z.glow,!0),e.set(10,4,n,Z.mouthGlow,!0)}for(let t of[-1,1]){for(let n of[9,12.5,16,19.5,23]){let r=9+t*(n<18?4:2.6)-(t<0),i=n===23;for(let t=0;t<(i?3:1);t++)e.set(r,6+t,Math.floor(n),t===(i?2:0)?Z.clawHi:m(Z.tooth,.85))}ml(e,9+t*5,2,6,9+t*8,1,1,2,(e,t,n,r)=>fl(.2+e*.7,t,n,r),.6,e=>e>.8)}return e}function wl(e,t){let n=new W(e,16,16),r=e/2;return pl(n,r,9.4,8,5,5.8,5.6,cl,t,.16),pl(n,r,13,8,3.6,2.6,4.2,cl,t+1,.16),pl(n,r,3.4,7,3.2,2.6,3.4,cl,t+2,.12),ml(n,r,4.2,4.5,r,3,.8,2,(e,t,n,r)=>fl(.2+e*.7,t,n,r),.5),n}function Tl(e,t){let n=new W(e,20,26),r=e/2;pl(n,r,14.6,7,3.4,5.4,3.6,cl,t,.14),pl(n,r,8.4,9.2,3.1,2.6,3.4,cl,t+1,.12),pl(n,r,3.6,12.6,3.8,2.3,5.4,cl,t+2,.12);for(let e of[-3,0,3]){let i=r+e;ml(n,i,2.6,14,i+e*.3,1.6,19,2,(e,n,r,i)=>cl(n,r,i,t+3),.2);let a=Math.round(i+e*.3);n.set(a,1,20,Z.claw),n.set(a,1,21,Z.claw),n.set(a,0,22,Z.clawHi),n.set(a,0,23,Z.clawHi),n.set(a,0,24,Z.tooth)}return ml(n,r,5.2,6,r,2.2,3,2,e=>e>.5?Z.claw:cl(r,4,5,t+4),.5),n}var El=4,Dl=17,Ol=14,kl=21;function Al(){let e=new W(19,8,40),t=new W(34,8,40),n=(n,r,i,a,o=!1)=>{let s=i+El;s<0||s>=40||(n<Dl?e.set(n,r,s,a,o):t.set(n-Dl,r,s,a,o))},r=(n,r,i)=>n<Dl?e.has(n,r,i+El):t.has(n-Dl,r,i+El),i=[[0,4],[20,-2],[31,3],[41,12],[48,28]],a=e=>{for(let t=0;t<i.length-1;t++){let[n,r]=i[t],[a,o]=i[t+1];if(e>=n&&e<=a){let s=(e-n)/Math.max(1,a-n),c=Math.hypot(a-n,o-r),l=t===0?0:Math.sin(s*Math.PI)*c*.2;return r+(o-r)*s+l*(t===i.length-2?.2:1)}}return 28},o=e=>e<=Dl?Ol+e/Dl*7+Math.sin(e/Dl*Math.PI)*1.6:kl+((e-Dl)/31)**1.35*7.4,s=[[Dl,kl,48,28],[Dl,kl,41,12],[Dl,kl,31,3],[Dl,kl,20,-2]],c=(e,t)=>{let n=99;for(let[r,i,a,o]of s){let s=a-r,c=o-i,l=z(((e-r)*s+(t-i)*c)/(s*s+c*c),0,1);n=Math.min(n,Math.hypot(e-(r+l*s),t-(i+l*c)))}return n=Math.min(n,Math.hypot(e-Dl,t-kl)*.8),n};for(let e=1;e<=47;e++){let t=Math.ceil(a(e)),r=Math.floor(o(e))-+(e>Dl);for(let i=t;i<=r;i++){let a=c(e+.5,i+.5),o=(i-t)/Math.max(1,r-t),s=l(e>>1,0,i>>1,71),u=l(e,0,i,72),d=.48+z(a/7,0,1)*.38+(s-.5)*.4+(u-.5)*.12+(1-o)*.06;if(d=z(d,0,.999),a<.9){n(e,2,i,a<.4?Z.glowHi:Z.glow,!0);continue}let f=[Z.m0,Z.m1,Z.m2,Z.m3][Math.floor(d*4)];n(e,2,i,ol(f,e,0,i,73,.03))}}let u=(e,t,n,r)=>e<.12||l(t,n,r,75)>.93?{c:l(t,r,n,75)>.5?Z.glowHi:Z.glow,g:!0}:e>.85?{c:ol(Z.s3,t,n,r,74),g:!1}:{c:cl(t,n,r,75),g:!1},d=(e,t,r,i,a,o)=>{let s=Math.ceil(Math.hypot(r-e,i-t)*2.2);for(let c=0;c<=s;c++){let l=c/s,d=Math.max(1,Math.round(a*(1-o*l))),f=Math.round(e+(r-e)*l-d/2+.5),p=Math.round(t+(i-t)*l-d/2+.5);for(let e=0;e<d;e++)for(let t=0;t<d;t++)for(let r=2;r<2+Math.max(2,d);r++){let i=u(l,f+e,r,p+t);n(f+e,r,p+t,i.c,i.g)}}};d(0,Ol,8,18,4,.2),d(8,18,Dl,kl,3,0),d(Dl,kl,48,28,3,.7),d(Dl,kl,41,12,2,.5),d(Dl,kl,31,3,2,.5),d(Dl,kl,20,-2,2,.5),d(2,5,12,9,2,.4),d(0,8,14,12,1,0);for(let[e,t,n,r]of s){let i=n-e,a=r-t,o=Math.hypot(i,a);d(n,r,n+i/o*3,r+a/o*3,2,.8)}for(let e=0;e<7;e++){let t=20+e*4,r=Math.round(o(t));for(let e=0;e<2;e++)n(t,3+e,r,ol(Z.s3,t,e,r,76))}ml(e,7,2,22,5,4,28,3,(e,t,n,r)=>cl(t,n,r,77),.7),d(Dl,kl,20,29,3,.8);for(let e=0;e<4;e++)n(18+ +(e>1),3,24+e*2,Z.clawHi);let f=new Kt(808);for(let e=0;e<40;e++){let e=f.int(19,44),t=f.int(Math.ceil(a(e))+1,Math.floor(o(e))-2);r(e,2,t)&&c(e,t)>3&&n(e,2,t,Z.m3,!1)}return{inner:e,outer:t}}function jl(e,t,n,r,i){let a=new W(e+4,t+4+i,n),o=(e+4)/2,s=(t+4)/2;for(let c=0;c<n;c++){let l=.62+.38*(c/(n-1)),u=e/2*l,d=t/2*l;for(let n=0;n<t+4;n++)for(let t=0;t<e+4;t++){let e=(t+.5-o)/u,i=(n+.5-s)/d;e*e+i*i<=1.02&&(i<-.38&&Math.abs(e)<.48?a.set(t,n,c,c&1?Z.glow:Z.glowHi,!0):a.set(t,n,c,i<-.38?ul(t,n,c):cl(t,n,c,r)))}if(c%3==1){let e=Math.round(s+d-.3);_l(a,Math.floor(o),e,c,i,.8,2),_l(a,Math.floor(o)-1,e,c,Math.max(1,i-2),.8,1)}}return{model:a,cx:o,cy:s,len:n}}function Ml(){let e=new W(26,28,30);for(let t=29;t>=23;t--){let n=.5-(29-t)*.03;for(let r=0;r<24;r++)for(let i=0;i<26;i++){let a=(i+.5-13)/(2.6*n+1),o=(r+.5-11)/(2.6*n+1);a*a+o*o<=1&&e.set(i,r,t,o<-.4?ul(i,r,t):cl(i,r,t,80))}}for(let[t,n,r,i]of[[0,0,22,3],[1,0,17,2],[-1,0,17,2],[0,1,13,2],[0,-1,11,2],[1,.7,14,2],[-1,.7,14,2],[1,-.7,9,1],[-1,-.7,9,1]]){let a=t*.55,o=n*.6;ml(e,13,11,23,13+a*r*.55,11+o*r*.55,23-r,i,(e,t,n,r)=>fl(.15+e*.85,t,n,r),.7,e=>e>.8)}return{model:e,cx:13,cy:11,len:30}}function Nl(){let e=at({vertexColors:!0,emissive:new N(0)}),t=new V,n=new V;n.position.y=7*al,t.add(n);let r=sl(yl(),vl.x,vl.y,vl.z,e);n.add(r);let i=new V;i.position.set(0,(23-vl.y)*al,(34-vl.z)*al),i.add(sl(bl(),vl.x,23,34,e)),n.add(i);let a=new V;a.position.set(0,4*al,(42.8-34)*al),a.scale.setScalar(.86),a.add(sl(Sl(),xl.x,xl.y,xl.z,e)),i.add(a);let o=new V;o.position.set(0,-1.4*al,4*al),o.rotation.x=.38,o.add(sl(Cl(),9,4,3,e)),a.add(o);let{inner:s,outer:c}=Al(),l=[],u=[];for(let t of[-1,1]){let r=new V;r.position.set(t*7.4*al,(16.4-vl.y)*al,(25-vl.z)*al);let i=sl(s,0,2,18,e);i.scale.x=t,r.add(i);let a=new V;a.position.set(t*Dl*al,0,7*al);let o=sl(c,0,2,25,e);o.scale.x=t,a.add(o),r.add(a),a.rotation.z=t*-.28,r.rotation.z=t*1.05,n.add(r),l.push(r),u.push(a)}let d=[],f=[],p=[wl(12,90),wl(14,95)],m=[Tl(12,100),Tl(14,105)];[[-6.8,25,0],[6.8,25,0],[-7.2,10,1],[7.2,10,1]].forEach(([t,r,i],a)=>{let o=new V;o.position.set(t*al,(8.6-vl.y)*al,(r-vl.z)*al),o.scale.setScalar(.84);let s=i?14:12;o.add(sl(p[i],s/2,12,8,e));let c=new V;c.position.y=-9*al;let l=sl(m[i],s/2,16,6,e);c.add(l),o.add(c),o.rotation.x=i?.45:-.55,c.rotation.x=i?-.7:.85,n.add(o),d.push(o),f.push(c)});let h=[],g=[jl(10,10,11,30,7),jl(8,8,11,31,6),jl(7,7,10,32,5),jl(5,5,10,33,4),Ml()],_=n;return g.forEach((t,n)=>{let r=new V;r.position.set(0,n===0?(8-vl.y)*al:0,n===0?(3-vl.z)*al:-(g[n-1].len-.5)*al),r.rotation.x=n===0?-.32:n===g.length-1?.48:-.06+n*.05,r.add(sl(t.model,t.cx,t.cy,t.len,e)),_.add(r),_=r,h.push(r)}),{root:t,mat:e,parts:{body:r,bodyG:n,neck:i,head:a,jaw:o,legs:d,knees:f,tail:h,wings:l,wingsOuter:u}}}var Pl=Math.PI*2,Fl=16734738,Il=16769162,Ll=1.2,Rl=16,zl=1,Bl=6.6,Vl=.95,Hl=4,Ul=.75;function Wl(e){return e*e*(3-2*e)}function Gl(e,t){let n=(t-e)%Pl;return n>Math.PI&&(n-=Pl),n<-Math.PI&&(n+=Pl),n}function Kl(e){let t=1.55*(e.baseScale||2);return{x:e.x+Math.sin(e.yaw)*t,y:e.y+(e.hover||0)+2.15*((e.baseScale||2)/2),z:e.z+Math.cos(e.yaw)*t}}function ql(e,t,n,r){let i=Kl(e),a=12+Math.random()*3.5,o=e.yaw+r,s=n.pos.x+(Math.random()-.5)*1.4,c=n.pos.z+(Math.random()-.5)*1.4,l=Math.max(2.5,Math.hypot(s-i.x,c-i.z)),u=z(l/a,.38,1.05),d=(n.pos.y+.7-i.y)/u+.5*Rl*u;t.spawnProjectile({owner:`enemy`,kind:`lavabolt`,x:i.x,y:i.y,z:i.z,vx:Math.sin(o)*a,vz:Math.cos(o)*a,vy:d,gravity:Rl,dmg:Math.max(7,e.def.dmg-4),life:u+.55,r:.62})}function Jl(e,t,n,r,i){e.breathAcc=(e.breathAcc||0)+r;let a=i?.055:.078,o=i?20:15;for(;e.breathAcc>=a&&(e.breathN||0)<o;){e.breathAcc-=a,e.breathN=(e.breathN||0)+1;let r=e.breathN;ql(e,t,n,Math.sin(r*.85)*(i?.22:.16)+(Math.random()-.5)*.06)}let s=Kl(e);Math.random()<r*50&&t.fx.emit(s.x,s.y,s.z,Math.sin(e.yaw)*4,.4,Math.cos(e.yaw)*4,Math.random()<.4?Il:Fl,.16,.28,1.5),t.vfx.glowNow(s.x,s.y,s.z,Fl,2.4+Math.sin(e.t*30)*.4,.95)}function Yl(e,t,{g:n,P:r,dx:i,dz:a,dist:o,sees:s,toP:c}){let l=!!e.enraged,u=0,d=0,f=Math.hypot(e.x-e.home.x,e.z-e.home.z),p=f>36;p&&(e.state===`chase`||e.state===`idle`||e.state===`wander`||e.state===`recover`)&&(s=!1),e.skyCd-=t,e.tickStrikes(t,r);let m=o||1,h=i/m,g=a/m;if(e.state===`idle`||e.state===`wander`){if(s&&!p)e.state=`chase`,e.cd=.6,n.audio.tone(90,.55,`sawtooth`,.14,-40),n.hud.floatText(...n.screenOf(e.x,e.y+e.hover+3.2,e.z),`Volcanum`,`crit`);else{if(e.wanderT-=t,e.wanderT<=0){e.wanderT=2.8+Math.random()*3;let t=Math.random()*Pl,n=2+Math.random()*4;e.target={x:e.home.x+Math.cos(t)*n,z:e.home.z+Math.sin(t)*n}}let n=e.target.x-e.x,r=e.target.z-e.z,i=Math.hypot(n,r);i>.8&&(u=n/i*1.1,d=r/i*1.1,e.yaw+=Gl(e.yaw,Math.atan2(n,r))*Math.min(1,t*2.4))}}else if(e.state===`chase`){(!s&&o>e.def.aggro*1.5||p)&&(e.state=`idle`),e.yaw+=Gl(e.yaw,c)*Math.min(1,t*5);let n=o<7.8?-1:+(o>13),r=Math.sin(e.t*.55+e.phase),i=e.def.speed*(l?1.2:1);if(u=h*i*n*(n<0?1.2:1)+g*r*i*.7,d=g*i*n*(n<0?1.2:1)-h*r*i*.7,e.cd<=.15&&e.skyCd<=0&&s&&o<18&&f<28)e.beginFlight();else if(e.cd<=0&&s&&(e.atk=o<6.2?Math.random()<.45?`tail`:`slash`:o<17?Math.random()<(l?.82:.7)?`breath`:`slash`:null,e.atk)){e.state=`windup`,e.t=0;let t={slash:.42,tail:.5,breath:.85}[e.atk]/(l?1.2:1);e.atk===`slash`?e.warn(`circle`,8.4,0,t,!0):e.atk===`tail`?e.warn(`circle`,7.2,0,t,!0):e.warn(`line`,l?5.2:4.2,16,t)}}else if(e.state===`windup`){e.yaw+=Gl(e.yaw,c)*Math.min(1,t*(e.atk===`breath`?3.2:8)),e.atk!==`breath`&&(u=-h*.5,d=-g*.5);let s={slash:.42,tail:.5,breath:.85}[e.atk]/(l?1.2:1);if(e.t>s){if(e.clearWarn(),e.kick=1,e.atk===`breath`)e.state=`breath`,e.t=0,e.breathAcc=0,e.breathN=0,n.audio.tone(70,.9,`sawtooth`,.16,40),n.shake(.2);else if(e.atk===`tail`){let t=Math.atan2(i,a);o<8.2&&r.hurt(e.def.dmg+3,e.x,e.z,14)&&n.fx.burst(r.pos.x,r.pos.y+1,r.pos.z,[Il,Fl],8,3,.1,.35),n.vfx.slashArc(e.x,e.y+e.hover+1.2,e.z,t+1.2,{radius:6.2,thick:2.2,sweep:4.4,color:Fl,hot:Il,life:.38,sweepT:.2,tail:.9,follow:()=>({x:e.x,y:e.y+e.hover,z:e.z})}),n.fx.dust(e.x,e.y,e.z,5,2.2,16738834),e.state=`recover`,e.t=0,e.cd=1.05}else o<8.6&&r.hurt(e.def.dmg+4,e.x,e.z,16)&&n.fx.burst(r.pos.x,r.pos.y+1,r.pos.z,[Il,16773824],10,3.2,.1,.4),n.fx.ring(e.x,e.y+e.hover-.2,e.z,Fl,16,7.6,.1,.4),n.vfx.slashArc(e.x,e.y+e.hover+1.8,e.z,Math.atan2(i,a),{radius:6.4,thick:2.6,sweep:5.4,color:Fl,hot:Il,life:.4,sweepT:.22,tail:.95,follow:()=>({x:e.x,y:e.y+e.hover,z:e.z})}),n.fx.dust(e.x,e.y,e.z,6,2.4,16747044),e.vx=-h*8,e.vz=-g*8,n.audio.tone(140,.16,`square`,.1,-80),e.state=`recover`,e.t=0,e.cd=l?.7:1.05}}else if(e.state===`breath`){e.yaw+=Gl(e.yaw,c)*Math.min(1,t*(l?2.4:1.7)),Jl(e,n,r,t,l);let i=Ll*(l?1.25:1);e.t>i&&(e.state=`recover`,e.t=0,e.cd=(l?1.3:2.15)+Math.random()*.4,n.audio.tone(50,.25,`sine`,.08,-20))}else if(e.state===`recover`)u=-h*.7,d=-g*.7,e.t>.48&&(e.state=s&&!p?`chase`:`idle`);else if(e.state===`ascend`)e.yaw+=Gl(e.yaw,c)*Math.min(1,t*6),e.hover=zl+5.6*Wl(z(e.t/Vl,0,1)),u=-h*1.2,d=-g*1.2,Math.random()<t*40&&n.fx.dust(e.x+(Math.random()-.5)*2.4,e.y,e.z+(Math.random()-.5)*2.4,1,2.4,Fl),e.t>=Vl&&(e.state=`air`,e.t=0,e.airEv=0);else if(e.state===`air`){e.hover=Bl,e.yaw+=Gl(e.yaw,c)*Math.min(1,t*8);let i=o<7?-1:+(o>12),a=e.def.speed*(l?1.3:1.12);u=h*a*i+g*a*.85*e.orbitDir,d=g*a*i-h*a*.85*e.orbitDir,e.t>.45&&e.t<2.3&&Jl(e,n,r,t*.45,l),e.t>=Hl&&e.beginDescend(r)}else if(e.state===`descend`){let n=e.dive;e.yaw+=Gl(e.yaw,Math.atan2(n.x-e.x,n.z-e.z))*Math.min(1,t*8);let i=z(e.t/Ul,0,1);e.hover=Bl+-5.6*i*i;let a=Math.min(1,t*4.5);e.moveBy((n.x-e.x)*a,(n.z-e.z)*a),e.t>=Ul&&e.slam(r)}return l&&e.state!==`breath`&&Math.random()<t*4&&n.fx.burst(e.x,e.y+e.hover+1.2,e.z,[Fl,1708048],1,.7,.1,.55,-.4,.4),[u,d]}var Xl=.032,Zl=Math.PI*2,Ql=[4348203,5204531,6126140,7047751],$l=[3090724,4011309,5129018,6444618,7891805],eu=[3810328,4993826,6177328],tu=[14274228,15260864,16050900],nu=(e,t,n,r=0)=>U(Ql[Math.floor(l(e>>1,t>>1,n>>1,11+r)*4)],.035,l(e,t,n,12)),ru=(e,t,n,r=0)=>{let i=z(Math.floor(l(e,t,n,21)*3)+Math.min(1,r),0,4);return U($l[i],.05,l(e,t,n,22))},iu=(e,t,n)=>U(eu[Math.floor(l(e>>1,t,n>>1,31)*3)],.05,l(e,t,n,32)),au=(e,t,n)=>U(tu[Math.floor(l(e,t>>1,n,41)*3)],.03,l(e,t,n,42)),ou=(e,t,n,r,i,a,o,s=1)=>e.ellipsoid(t,n,r,i,a,o,(e,t,r)=>m(nu(e,t,r),s*(1+(t-n)/a*.05)));function su(e,t,n){for(let r=e.sz-1;r>=0;r--)if(e.has(t,n,r))return r;return-1}function cu(e,t,n){for(let r=0;r<e.sz;r++)if(e.has(t,n,r))return r;return-1}var lu=(e,t,n,r)=>e.get(t,n,r)&16777215;function uu(e,t,n,r,i,a,o,s,c=3,u=0){let d=new Kt(s);for(let c=Math.floor(r-o-1);c<=Math.ceil(r+o+1);c++)for(let u=Math.floor(n-a-1);u<=Math.ceil(n+a+1);u++)for(let d=Math.floor(t-i-1);d<=Math.ceil(t+i+1);d++){let f=(d+.5-t)/i,p=(u+.5-n)/a,m=(c+.5-r)/o;f*f+p*p+m*m<=1+(l(d,u,c,s)-.5)*.5&&e.set(d,u,c,ru(d,u,c))}let f=Math.round((i+a+o)*4.5);for(let s=0;s<f;s++){let s=d.range(-1,1),l=d.range(0,Zl),f=Math.sqrt(1-s*s),p=f*Math.cos(l),m=s+u,h=f*Math.sin(l),g=Math.hypot(p,m,h)||1;p/=g,m/=g,h/=g;let _=t+f*Math.cos(l)*i,v=n+s*a,y=r+f*Math.sin(l)*o,b=d.int(1,c);for(let t=0;t<=b;t++){let n=Math.round(_+p*t),r=Math.round(v+m*t),i=Math.round(y+h*t);e.set(n,r,i,ru(n,r,i,t))}}}function du(e,t,n,r,i=null){let a=[];for(let r=t;r<n;r++){for(let t=0;t<e.sz;t++){let n=-1,i=-1;for(let a=0;a<e.sx;a++)e.has(a,r,t)&&(n<0&&(n=a),i=a);n>=0&&a.push([n-1,r,t],[i+1,r,t])}for(let t=0;t<e.sx;t++){let n=-1,i=-1;for(let a=0;a<e.sz;a++)e.has(t,r,a)&&(n<0&&(n=a),i=a);n>=0&&a.push([t,r,n-1],[t,r,i+1])}}for(let[t,n,o]of a)(!i||i(t,n,o))&&e.set(t,n,o,typeof r==`function`?r(t,n,o):r)}function fu(e,t,n,r,i,a){let o=i-n,s=a-r,c=z(((e+.5-n)*o+(t+.5-r)*s)/(o*o+s*s),0,1);return Math.hypot(e+.5-(n+c*o),t+.5-(r+c*s))}var pu=6;function mu(){let e=new W(44,44,26),t=e=>e+pu;ou(e,22,t(2.5),13,9.6,5.2,6,.92),ou(e,22,t(8.5),13.4,10.2,6.6,6.4,.97),ou(e,22,t(15.5),13.6,11,7.6,7.4,1.02);for(let n of[-1,1])ou(e,22+n*5.4,t(16.5),16.4,5.6,4.4,4.2,1.1);ou(e,22,t(21),12.4,12,3.8,6.4,.98),e.box(19,t(22),10,25,t(25),16,nu);for(let n=t(5);n<t(21);n++)for(let r=0;r<e.sx;r++){let i=su(e,r,n);if(i<0)continue;let a=lu(e,r,n,i),o=Math.abs(r+.5-22)<1.1&&n>t(10),s=n===t(12)&&Math.abs(r-22)>1&&Math.abs(r-22)<9,c=(n===t(8)||n===t(6))&&Math.abs(r-22)<7;o||s?e.set(r,n,i,m(a,.74)):c&&e.set(r,n,i,m(a,.86))}let n=e.data.slice(),r=[13.5,t(22.5),30,t(4.5)],i=[30.5,t(22.5),14,t(4.5)];for(let n=t(3);n<t(23);n++)for(let t=0;t<e.sx;t++){let a=fu(t,n,r[0],r[1],r[2],r[3])<1.55,o=fu(t,n,i[0],i[1],i[2],i[3])<1.55;if(!a&&!o)continue;let s=su(e,t,n);s>=0&&e.set(t,n,s+1,iu(t,n,s+1));let c=cu(e,t,n);c>=0&&e.set(t,n,c-1,iu(t,n,c-1))}du(e,t(1),t(4),iu,(e,n)=>!(n===t(3)&&l(e,n,0,3)<.3)),du(e,t(4),t(5),(e,t,n)=>m(iu(e,t,n),.7));let a=su(e,22,t(13))+1;for(let n=-2;n<=2;n++)for(let r=-2;r<=2;r++){if(Math.abs(r)+Math.abs(n)>3)continue;let i=Math.abs(r)+Math.abs(n)>=3||Math.abs(r)===2||Math.abs(n)===2;e.set(22+r,t(13)+n,a,i?U(9080470,.06,l(r,n,1,5)):2763312)}e.set(22,t(13),a,1447450),e.set(21,t(13)-1,a,1842210);for(let n of[-1,1])uu(e,22+n*12.2,t(22.4),12.6,5.6,3.6,6.8,211+n,4,.55),uu(e,22+n*8,t(23.6),11.6,4.2,2.2,5,221+n,3,.7);return uu(e,22,t(23.4),8.4,8,2.6,3.2,231,3,.7),uu(e,22,t(23.6),16,6.4,1.6,2.2,232,2,.5),be(e,n),e}function hu(){let e=new W(36,16,26);for(let t=0;t<=15;t++){let n=15-t,r=11.2+n*.16,i=7.6+n*.12;for(let n=0;n<e.sz;n++)for(let a=0;a<e.sx;a++){let o=a+.5-18,s=n+.5-13,c=(o/r)**2+(s/i)**2,u=(o/(r-2.8))**2+(s/(i-2.8))**2;if(c>1||u<1)continue;let d=2+Math.floor(l(a,3,n,7)*7);t<d-+(l(a,t,n,8)<.45)-(l(a,t,n,9)<.2)||e.set(a,t,n,ru(a,t,n,+(t<d+2)))}}for(let t=1;t<=15;t++){let n=1.4+(t-1)*.42;for(let r=0;r<e.sx;r++){let i=Math.abs(r+.5-18);if(i>n)continue;let a=su(e,r,Math.max(t,6)),o=a>=0?a:19,s=i>n-1.3;e.set(r,t,o,s?m(iu(r,t,o),.62):iu(r,t,o)),e.set(r,t,o+1,s?m(iu(r,t,o+1),.62):iu(r,t,o+1))}}return e}function gu(){let e=new W(28,28,28);ou(e,14,11.2,12.6,7,6,6.8,1.02),ou(e,14,7.4,14.6,6.7,4.4,5.2,.98),ou(e,14,3.8,15.4,6.2,3.4,5,.95),ou(e,14,12.2,17.2,6.6,1.9,2.4,.74),ou(e,14,7.4,19.6,2.2,2.1,1.9,1.02);for(let t of[-1,1])ou(e,14+t*5.2,6.4,16.8,2.4,2.3,2.2,1.04);let t=e.data.slice();for(let t of[-1,1]){let n=e=>14+t*e;for(let t=0;t<=1.001;t+=.05){let r=Math.round(n(6.4+t*6.4)),i=8.6+t*6.2,a=3.4*(1-t)+1;for(let t=Math.round(i);t<i+a;t++)for(let n=11;n<=13;n++)e.set(r,t,n,nu(r,t,n,5))}for(let t=.1;t<.6;t+=.1){let r=Math.round(n(6.4+t*6.4)),i=Math.round(8.6+t*6.2)+1;e.set(r,i,14,10777690),e.set(r,i+1,14,12158570)}let r=(n,r)=>{let i=14+t*n,a=su(e,i-0,10);a>=0&&e.set(i,10,a,r)};r(2.5,15655840),r(3.5,15655840),r(4.5,1708040),[2.5,3.5,4.5,5.5,6.5].forEach((n,r)=>{let i=14+t*Math.floor(n),a=11+Math.round(r*.5),o=su(e,i,a);o>=0&&(e.set(i,a,o+1,m(nu(i,a,o),.5)),e.set(i,a+1,o,m(nu(i,a,o),.6)))});let i=t>0?18:8;for(let n=0;n<8;n++){let r=n<5?2:1;for(let a=0;a<r;a++){let r=i+a+(n>=5?t>0?0:1:0),o=su(e,r,3)+1;e.set(r,2+n,o+0,au(r,n,o)),e.set(r,2+n,o+1,n>5?16050900:au(r,n,o+1))}}let a=14+t*1,o=su(e,a,7);o>=0&&e.set(t>0?a:a-1,6,o,1845780)}for(let t=9;t<=18;t++){let n=su(e,t,4);n<0||(e.set(t,4,n,1838858),(t-14)%2==0&&Math.abs(t-14)<4&&e.set(t,3,n+1,16050900),e.set(t,5,n,m(lu(e,t,5,n),.75)))}return be(e,t),e}var _u=29,vu=16;function yu(e){let t=new W(20,36,20);ou(t,10,26.5,10,6,4.6,5.6,1.06),ou(t,10,21,10,5.2,6,5,1),ou(t,10,21.8,12,3.8,3.6,2.6,1.08),ou(t,10,16.2,10,4.5,2.8,4.3,.96),ou(t,10,10.8,10,4.8,6.4,4.6,1),ou(t,10,5.4,10,3.6,2.4,3.5,.94),ou(t,10,2.9,10.6,4.5,3.3,4.3,1.04);for(let e=7;e<=13;e+=2){let n=su(t,e,3);n>=0&&t.set(e,3,n,m(lu(t,e,3,n),.62));let r=su(t,e,2);r>=0&&t.set(e,2,r,m(lu(t,e,2,r),.8))}let n=t.data.slice();return du(t,5,8,(e,t,n)=>t===6?m(iu(e,t,n),.66):iu(e,t,n),(e,t,n)=>!(e+n+t&1)||t===7),uu(t,10,11.4,10,5.9,3,5.7,e,2,-.3),uu(t,10,28,10,5.6,1.6,5.4,e+9,2,.6),be(t,n),t}var bu=28,xu=14;function Su(e){let t=new W(22,34,26);ou(t,11,22,10,6.5,7.4,6.2,1),ou(t,11,14.6,10.6,5.2,3,5,.96),ou(t,11,10,9.8,4.9,5.6,4.8,.98),ou(t,11,11,7.8,3.4,3.4,2.4,1.02),ou(t,11,5.2,10,4,2.2,3.8,.94),ou(t,11,2.2,13.2,5.3,2.4,6.6,1.02);for(let e=0;e<4;e++){let n=7.7+e*2.2;ou(t,n,1.5,19.4,1.4,1.5,2.2,1.04);let r=su(t,Math.floor(n),1);r>=0&&t.set(Math.floor(n),1,r,13483936)}let n=t.data.slice();return du(t,2,6,iu,(e,t,n)=>!(Math.floor(Math.atan2(n-10,e-11)*2.4)+t&1)),uu(t,11,8.8,10,6.3,3.2,6.1,e,2,-.3),be(t,n),t}function Cu(){let e=at({vertexColors:!0,emissive:new N(0)}),n=new V,r=new V;r.position.y=28*Xl,n.add(r);let i=new V;r.add(i),i.add(R(mu(),22,pu,13,e,Xl));let a=new V;a.position.set(0,23.4*Xl,1.6*Xl),a.add(R(gu(),14,1,14,e,Xl)),i.add(a);let o=new V;o.position.y=5*Xl,o.add(R(hu(),18,15,13,e,Xl)),r.add(o);let s=[];for(let[n,r]of[[-1,301],[1,302]]){let a=yu(r),o=t(a,10,_u,10,e,vu),c=new V;c.position.set(n*14.2*Xl,22.4*Xl,.4*Xl);let l=new V;l.position.y=-13*Xl,l.add(o.lower),c.add(o.upper,l),i.add(c),s.push({shoulder:c,elbow:l})}let[c,l]=s,u=new V;u.position.set(0,-13*Xl,.3*Xl),l.elbow.add(u);let d=I(`orcblade`);d.scale.setScalar(.82),d.rotation.x=Math.PI/2,d.position.y=.02,u.add(d);let f=[];for(let[n,i]of[[-1,401],[1,402]]){let a=Su(i),o=t(a,11,bu,10,e,xu),s=new V;s.position.set(n*6.2*Xl,0,0);let c=new V;c.position.y=-14*Xl,c.add(o.lower),s.add(o.upper,c),r.add(s),f.push({thigh:s,knee:c})}let[p,m]=f;return n.traverse(e=>{e.isMesh&&(e.frustumCulled=!0)}),{root:n,mat:e,parts:{body:i,head:a,cloth:o,armL:c.shoulder,armR:l.shoulder,elbowL:c.elbow,elbowR:l.elbow,legL:p.thigh,legR:m.thigh,kneeL:p.knee,kneeR:m.knee}}}var wu=.04,Tu=Math.PI*2,Eu=[d.furLo,d.fur,d.fur,d.furHi,d.furHi,d.furWhite],Du=[d.ice,d.iceDeep,d.iceHi],Ou=(e,t,n,r=0)=>{if(l(e>>1,t>>1,n>>1,5)<.12)return U(Du[Math.floor(l(e,t,n,6)*3)],.04,l(e,t,n,7));let i=z(Math.floor(l(e,t,n,21)*4)+Math.min(2,r),0,Eu.length-1);return U(Eu[i],.04,l(e,t,n,22))},ku=(e,t,n,r=0)=>U(l(e>>1,t>>1,n>>1,31+r)<.5?d.skin:m(d.skin,.88),.03,l(e,t,n,32)),Au=(e,t,n,r=0)=>U(r?d.leatherHi:l(e>>1,t,n>>1,41)<.5?d.leather:m(d.leather,.84),.05,l(e,t,n,42)),ju=(e,t,n)=>U(l(e>>1,t>>1,n,51)<.5?d.hide:m(d.hide,.82),.05,l(e,t,n,52)),Mu=(e,t,n,r=0)=>U(r>.7?d.iceHi:r>.3?d.ice:d.iceDeep,.03,l(e,t,n,61)),Nu=(e,t,n,r,i,a,o,s=1)=>e.ellipsoid(t,n,r,i,a,o,(e,t,r)=>m(Ou(e,t,r),s*(1+(t-n)/a*.05)));function Pu(e,t,n){for(let r=e.sz-1;r>=0;r--)if(e.has(t,n,r))return r;return-1}function Fu(e,t,n){for(let r=0;r<e.sz;r++)if(e.has(t,n,r))return r;return-1}function Iu(e,t,n,r,i,a,o,s,c=3,u=0,d=4.5){let f=new Kt(s);for(let c=Math.floor(r-o-1);c<=Math.ceil(r+o+1);c++)for(let u=Math.floor(n-a-1);u<=Math.ceil(n+a+1);u++)for(let d=Math.floor(t-i-1);d<=Math.ceil(t+i+1);d++){let f=(d+.5-t)/i,p=(u+.5-n)/a,m=(c+.5-r)/o;f*f+p*p+m*m<=1+(l(d,u,c,s)-.5)*.5&&e.set(d,u,c,Ou(d,u,c))}let p=Math.round((i+a+o)*d);for(let s=0;s<p;s++){let s=f.range(-1,1),l=f.range(0,Tu),d=Math.sqrt(1-s*s),p=d*Math.cos(l),m=s+u,h=d*Math.sin(l),g=Math.hypot(p,m,h)||1;p/=g,m/=g,h/=g;let _=t+d*Math.cos(l)*i,v=n+s*a,y=r+d*Math.sin(l)*o,b=f.int(1,c);for(let t=0;t<=b;t++){let n=Math.round(_+p*t),r=Math.round(v+m*t),i=Math.round(y+h*t);e.set(n,r,i,Ou(n,r,i,t))}}}function Lu(e,t,n,r,i,a,o,s,c){let l=Math.hypot(i,a,o)||1;for(let u=0;u<=s;u++){let d=u/s,f=Math.max(.55,c*(1-d)),p=t+i/l*u,m=n+a/l*u,h=r+o/l*u,g=Math.ceil(f);for(let t=-g;t<=g;t++)for(let n=-g;n<=g;n++)for(let r=-g;r<=g;r++){if(Math.hypot(t,n,r)>f)continue;let i=Math.round(p+t),a=Math.round(m+n),o=Math.round(h+r);e.set(i,a,o,Mu(i,a,o,d))}}}function Ru(e,t,n,r,i,a){let o=i-n,s=a-r,c=z(((e+.5-n)*o+(t+.5-r)*s)/(o*o+s*s),0,1);return Math.hypot(e+.5-(n+c*o),t+.5-(r+c*s))}var zu=8;function Bu(){let e=new W(68,64,44),t=e=>e+zu;Nu(e,34,t(1),22,12.5,7,9.5,.92),Nu(e,34,t(10),22.6,15.5,8.5,11.5,.97),Nu(e,34,t(21),23,19.5,10.5,13.5,1.02);for(let n of[-1,1])Nu(e,34+n*9,t(23.5),28.5,9,6.2,6,1.08);Nu(e,34,t(31),20.8,22,6.2,11,.98),Nu(e,34,t(36),23,6.5,3.6,6,1);let n=e.data.slice(),r=[19,t(33),46,t(3)],i=[49,t(33),22,t(3)];for(let n=t(1);n<t(34);n++)for(let t=0;t<e.sx;t++){let a=Ru(t,n,r[0],r[1],r[2],r[3])<2.2,o=Ru(t,n,i[0],i[1],i[2],i[3])<2.2;if(!a&&!o)continue;let s=Pu(e,t,n);s>=0&&(e.set(t,n,s+1,Au(t,n,s+1,+((t+n)%5==0))),e.set(t,n,s+2,m(Au(t,n,s+2),.9)));let c=Fu(e,t,n);c>=0&&e.set(t,n,c-1,Au(t,n,c-1))}for(let n=t(1);n<t(34);n+=3)for(let[t,a]of[[r,0],[i,0]]){let r=(n-t[1])/(t[3]-t[1]),i=Math.round(t[0]+(t[2]-t[0])*r),o=Pu(e,i,n);o>=0&&e.set(i+a,n,o,1905935)}let a=Pu(e,34,t(14))+1;for(let n=-2;n<=2;n++)for(let r=-2;r<=2;r++)Math.abs(r)+Math.abs(n)>3||e.set(34+r,t(14)+n,a,Math.abs(r)+Math.abs(n)>=3?d.trim:d.leatherLo);be(e,n);for(let n of[-1,1]){Iu(e,34+n*18,t(33),21,8,4.5,8.5,211+n,6,.9,5),Iu(e,34+n*12,t(35.4),20,6,3,6.5,221+n,5,1,5);for(let r=0;r<4;r++)Lu(e,34+n*(13+r*3.4),t(36+r%2*1.5),20+r*1.2,n*.55,1,-.25+r*.1,8+r%3*2.5,2.5)}Iu(e,34,t(36.4),16.5,11,3.4,4.6,231,5,1,5);for(let n=0;n<7;n++)Lu(e,22+n*4,t(37.5),16+n%2,(n-3)*.12,1,-.5,9+n*7%4*1.8,2.6);Iu(e,34,t(34.6),27,9,2.4,3.6,232,4,.8,5),Iu(e,34,t(15),12.5,14,11,4,233,4,.2,4),Iu(e,34,t(5),30,11,5,3,234,3,0,4);for(let n=0;n<9;n++){let r=n/9*Tu;Lu(e,34+Math.cos(r)*16,t(20+n%3*3),27+Math.sin(r)*6,Math.cos(r)*.9,.2,Math.sin(r)*.9,4+n%3,1.6)}return e}function Vu(){let e=new W(50,30,40);for(let t=18;t<=28;t++){let n=1+(t>25?.2*(t-25):0),r=16*n,i=12*n;for(let n=0;n<e.sz;n++)for(let a=0;a<e.sx;a++){let o=a+.5-25,s=n+.5-20,c=(o/r)**2+(s/i)**2,u=(o/(r-3.4))**2+(s/(i-3.4))**2;c>1||u<1||t<21&&l(a,t,n,71)<.3||e.set(a,t,n,Ou(a,t,n,+(t<21)))}}let t=new Kt(91);for(let n=0;n<70;n++){let n=t.range(0,Tu),r=t.int(19,27),i=Math.round(25+Math.cos(n)*16.5),a=Math.round(20+Math.sin(n)*12.5),o=t.int(2,5);for(let t=0;t<=o;t++)e.set(Math.round(i+Math.cos(n)*t*.8),Math.round(r-t*.5),Math.round(a+Math.sin(n)*t*.8),Ou(i,r,a,t))}for(let t=4;t<20;t++){let n=1.6+(t-4)*.52;for(let r=0;r<e.sx;r++){let i=Math.abs(r+.5-25);if(i>n)continue;let a=i>n-1.5;t<9&&a&&l(r,t,1,72)<.35||t<6&&l(r,t,2,73)<.25||(e.set(r,t,32,a?m(ju(r,t,32),.7):ju(r,t,32)),e.set(r,t,33,a?m(Au(r,t,33),.7):ju(r,t,33)),!a&&(r+t)%6==0&&e.set(r,t,34,m(ju(r,t,34),.78)))}}for(let t=0;t<14;t++){let n=18-t;for(let r of[24-Math.round(t*.45),25+Math.round(t*.45)])e.set(r,n,34,m(Au(r,n,14),.72))}for(let[t,n,r]of[[-9,13,9],[-6,9,7],[-3,6,6],[4,6,6],[7,9,8],[10,13,9]])Lu(e,25+t,n,34,t*.04,-1,.15,r,1.5);return e}var Hu=22;function Uu(){let e=new W(44,44,44),t=Hu;Nu(e,t,20,17,12.4,11,11.6,1),Nu(e,t,14,21,10,7,9,.96),Nu(e,t,24.4,24,10,3.2,4.2,.9);let n=e.data.slice();for(let n=23;n<34;n++)for(let r=8;r<26;r++)for(let i=12;i<=31;i++){if(!e.has(i,r,n))continue;let a=i+.5-t,o=(a/7.6)**2+((r+.5-13.4)/5.8)**2<=1,s=[-1,1].some(e=>((a-e*4.7)/3.5)**2+((r+.5-20.3)/2.7)**2<=1);(o||s||Math.abs(a)<1.7&&r>13&&r<21)&&e.set(i,r,n,ku(i,r,n,+(r>18)))}e.ellipsoid(t,13.2,27.5,6.2,3.8,5,(e,t,n)=>m(ku(e,t,n,2),1.1));for(let n of[-1,1]){e.ellipsoid(t+n*4.7,20.4,26.9,2.5,1.7,2.1,(e,t,n)=>m(ku(e,t,n,4),.55));for(let r=0;r<6;r++){let i=t+n*(2+r*1.5),a=22.7+r*.62;e.ellipsoid(i,a,27.4,2,1.5,2.6,(e,t,n)=>m(Ou(e,t,n,1),.82))}}e.ellipsoid(t,10.2,24.6,6.4,1.1,4.6,d.mouth);for(let n of[-1,1]){let r=t+n*4.6-(n<0?2:0)-(n<0?0:1);for(let t=0;t<2;t++)for(let i=0;i<3;i++){let a=r+i,o=20+t,s=Pu(e,a,o);if(s<0)continue;let c=n<0?i===2:i===0;t===1&&(n<0?i===0:i===2)||(e.set(a,o,s,t===1&&c?d.eyeHi:d.eye,!0),e.set(a,o,s-1,d.eye,!0))}}be(e,n);for(let n of[-1,1])Iu(e,t+n*11.4,16,15,4.6,6.4,6.4,301+n,5,-.2,5),Iu(e,t+n*9,23,15,5,3.4,6,311+n,6,1,5),Lu(e,t+n*9,28,14,n*.6,1,-.2,9,2.4),Lu(e,t+n*5,31,12,n*.2,1,-.4,10,2.2),Lu(e,t+n*12.5,25,12,n*1,.6,-.2,7,1.9);Iu(e,t,27.6,14,8.8,3.4,8.6,321,6,1,5),Iu(e,t,21,6.5,9.5,8,4.4,322,5,.1,5);for(let t=0;t<5;t++)Lu(e,18+t*2,30,12-t%2*3,0,1,-.6,8+t%3*2,2.1);let r=(t,n,r)=>{for(let i=0;i<n;i++){let a=Math.max(.55,r*(1-i/n));for(let r=-1;r<=1;r++)for(let o=-1;o<=1;o++){if(Math.hypot(r,o)>a)continue;let s=t+r,c=28+o+Math.round(i*.12),u=11-i;e.set(s,u,c,U(i>n-2?d.fang:d.fangLo,.02,l(s,u,c,81)))}}};r(17,7,1.6),r(26,7,1.6);for(let e of[19,21,23,24])r(e,3,.9);return e}function Wu(){let e=new W(34,22,34);e.ellipsoid(17,5,15.5,8.2,3.2,10,(e,t,n)=>m(ku(e,t,n,6),.8)),e.ellipsoid(17,7.2,14.5,5.6,1.5,6.4,1976906),e.ellipsoid(17,4,22,5.2,2.5,4,(e,t,n)=>m(ku(e,t,n,7),.9)),Iu(e,17,1.5,19,6,2.6,5,331,5,-.5,5);let t=(t,n,r,i)=>{for(let a=0;a<n;a++){let o=Math.max(.55,r*(1-a/n));for(let r=-1;r<=1;r++)for(let s=-1;s<=1;s++){if(Math.hypot(r,s)>o)continue;let c=t+r,u=i+s,f=6+a;e.set(c,f,u,U(a>n-2?d.fang:d.fangLo,.02,l(c,f,u,82)))}}};t(12,6,1.5,22),t(21,6,1.5,22);for(let e of[14,16,18,19])t(e,3,.9,24);for(let e of[-1,1])for(let n=10;n<21;n+=3)t(17+e*6,2,.8,n);return e}var Gu=54,Ku=30;function qu(e){let t=new W(34,62,36);Nu(t,17,49,15,9.5,8,9.2,1.06),Nu(t,17,40,15,8.6,9.5,8.4,1),Nu(t,17,41,18.4,5.4,5,4,1.08),Nu(t,17,31,15,7.6,4.4,7.4,.96),Nu(t,17,21,15.5,9.2,10,8.8,1),Nu(t,17,10.5,15.5,7,3.4,6.8,.94),Nu(t,17,6,16.4,9.6,5.6,8.2,1.04);let n=t.data.slice();Iu(t,17,42,15,9.4,4.6,9.2,e,4,.1,5),Iu(t,17,22,15,10.2,5.4,9.8,e+4,4,-.2,5),Iu(t,17,52,15,9.4,4,9,e+9,5,.9,5);for(let e=0;e<3;e++)Lu(t,13+e*4,56,14+e%2*2,(e-1)*.3,1,-.2,6+e,2.1);for(let e=0;e<3;e++)Lu(t,17+(e-1)*4,31,7.5,(e-1)*.3,.1,-1,6+e,1.9);Lu(t,17,31,8,0,.1,-1,9,2.1);for(let e=0;e<4;e++){let n=11.6+e*3.6;Nu(t,n,2.4,21.6,2,2.4,3,1.05);let r=(e-1.5)*.12;for(let e=0;e<10;e++){let i=e/9,a=Math.max(.55,2*(1-i)),o=n+r*e,s=2.4-Math.sin(i*1.4)*2.6-i*.6,c=23+i*6.6+Math.sin(i*1.5)*1.2,u=Math.ceil(a);for(let e=-u;e<=u;e++)for(let n=-u;n<=u;n++)for(let r=-u;r<=u;r++){if(Math.hypot(e,n,r)>a)continue;let u=Math.round(o+e),f=Math.round(s+n),p=Math.round(c+r);t.set(u,Math.max(0,f),p,U(i>.65?d.clawTip:i>.25?d.claw:d.clawDark,.03,l(u,f,p,91)))}}}let r=e%2?1:-1;for(let e=0;e<9;e++){let n=e/8,i=Math.max(.55,1.8*(1-n)),a=17+r*(8+n*4),o=5-n*3,s=18+n*5,c=Math.ceil(i);for(let e=-c;e<=c;e++)for(let r=-c;r<=c;r++)for(let u=-c;u<=c;u++){if(Math.hypot(e,r,u)>i)continue;let c=Math.round(a+e),f=Math.round(o+r),p=Math.round(s+u);t.set(c,Math.max(0,f),p,U(n>.6?d.clawTip:d.claw,.03,l(c,f,p,92)))}}return be(t,n),t}var Ju=38,Yu=19;function Xu(e){let t=new W(32,46,44);Nu(t,16,31,15,10,9.4,9.6,1),Nu(t,16,20.5,15.8,8,4.4,7.8,.96),Nu(t,16,13.5,14.8,7.6,7.6,7.2,.98),Nu(t,16,13,11.8,5,4.4,3.2,1.02),Nu(t,16,6,15,6.6,3.4,6.2,.94),Nu(t,16,3.4,19.2,8.6,3.6,9.4,1.02);for(let e=0;e<4;e++){let n=10.4+e*3.8;Nu(t,n,2,27.6,2.2,2.2,3.4,1.04);for(let r=0;r<10;r++){let i=r/9,a=Math.max(.6,2.1*(1-i)),o=n+(e-1.5)*.18*r,s=2-i*1.6,c=30+i*6.6,u=Math.ceil(a);for(let e=-u;e<=u;e++)for(let n=-u;n<=u;n++)for(let r=-u;r<=u;r++){if(Math.hypot(e,n,r)>a)continue;let u=Math.round(o+e),f=Math.round(s+n),p=Math.round(c+r);t.set(u,Math.max(0,f),p,U(i>.62?d.clawTip:i>.2?d.claw:d.clawDark,.03,l(u,f,p,93)))}}}let n=t.data.slice();Iu(t,16,30,15,10.2,5.4,10,e,4,-.1,5),Iu(t,16,14,15,8.4,4.4,8,e+4,4,-.3,5),Iu(t,16,4,19,9,3,9.6,e+8,3,0,4);for(let e=0;e<3;e++)Lu(t,13+e*3,21,21.5,(e-1)*.3,.2,1,6+e,2);return be(t,n),t}function Zu(){let e=at({vertexColors:!0,emissive:new N(0)}),n=new V,r=new V;r.position.y=Ju*wu,n.add(r);let i=new V;r.add(i),i.add(R(Bu(),34,zu,22,e,wu));let a=new V;a.position.set(0,35*wu,3.2*wu),a.add(R(Uu(),Hu,5,17,e,wu));let o=new V;o.position.set(0,4.6*wu,7.2*wu),o.add(R(Wu(),17,4,6,e,wu)),a.add(o),i.add(a);let s=new V;s.position.y=3*wu,s.add(R(Vu(),25,28,20,e,wu)),r.add(s);let c=[];for(let[n,r]of[[-1,501],[1,502]]){let a=qu(r),o=t(a,17,Gu,15,e,Ku),s=new V;s.position.set(n*21.5*wu,30.4*wu,.8*wu);let l=new V;l.position.y=-24*wu,l.add(o.lower),s.add(o.upper,l),i.add(s),c.push({shoulder:s,elbow:l})}let[l,u]=c,d=[];for(let[n,i]of[[-1,601],[1,602]]){let a=Xu(i),o=t(a,16,Ju,15,e,Yu),s=new V;s.position.set(n*8.4*wu,0,0);let c=new V;c.position.y=-19*wu,c.add(o.lower),s.add(o.upper,c),r.add(s),d.push({thigh:s,knee:c})}let[f,p]=d;return n.traverse(e=>{e.isMesh&&(e.frustumCulled=!0)}),{root:n,mat:e,parts:{body:i,head:a,jaw:o,cloth:s,armL:l.shoulder,armR:u.shoulder,elbowL:l.elbow,elbowR:u.elbow,legL:f.thigh,legR:p.thigh,kneeL:f.knee,kneeR:p.knee}}}var Qu=.03,$u=(e=1,t=3)=>(n,r,i)=>m(wt(rn.plate,n,r,i,t),e),ed=(e,t,n,r=0)=>e*3+t*5+n&3?Xe(rn.gold,e,t,n,21+r,.04):Xe(rn.goldHi,e,t,n,20+r,.03),td=(e,t,n,r=0)=>Xe(rn.goldLo,e,t,n,22+r,.05),nd=(e,t,n,r=0)=>Xe(wt([rn.mail,rn.mailHi,rn.mailLo,rn.mail],e,t,n,23+r),e,t,n,24+r,.06),rd=(e={})=>({col:rn.glow,core:rn.glowCore,glow:!0,...e}),id=10;function ad(){let e=new W(64,56,40),t=e=>e+id,n=e.data.slice();H(e,32,t(0),20,13,7,9,$u(.94)),H(e,32,t(8),20,11.5,6.5,8.5,$u(.98)),H(e,32,t(15),20.3,13,6.5,9,$u(1)),H(e,32,t(22),20.8,15,8.5,10,$u(1.03));for(let n of[-1,1])H(e,32+n*7,t(23),25,8,6.5,5.5,$u(1.07));H(e,32,t(29),20,17,4,9,$u(.98)),H(e,32,t(32.5),20,8.5,3.5,7,$u(1)),H(e,32,t(36),20,5.8,3,5.2,nd),H(e,32,t(21),15,13,9,5,$u(.92));for(let n=t(-3);n<=t(6);n++)for(let r=0;r<64;r++){let i=rt(e,r,n);i>=0&&n>=t(3)&&n<=t(4)&&e.set(r,n,i,ed(r,n,i,1))}lt(e,t(3),t(4),(e,t,n)=>ed(e,t,n,2)),Nt(e,32,t(3.5),4.2,4.2,{base:(e,t,n)=>td(e,t,n,3),rim:rn.gold,rimHi:rn.goldHi,cross:rd({up:1,down:1,side:1,t:1})}),lt(e,t(12),t(12),(e,t,n)=>ed(e,t,n,4)),lt(e,t(17),t(17),(e,t,n)=>td(e,t,n,5));for(let n of[-1,1]){for(let r=0;r<=11;r++){let i=32+n*(3+r),a=t(12+Math.round(r*.5)),o=rt(e,i,a);o>=0&&(e.set(i,a,o,ed(i,a,o,6)),e.set(i,a+1,o,td(i,a+1,o,7)))}for(let r=0;r<=9;r++){let i=32+n*(2+Math.round(r*.45)),a=t(18+r),o=rt(e,i,a);o>=0&&r>7&&e.set(i,a,o,ed(i,a,o,8))}}Nt(e,32,t(22.5),8.5,10.5,{base:$u(1.08),rim:rn.gold,rimHi:rn.goldHi,cross:rd({up:8,down:7,side:5,t:3,hy:2})});for(let n of[-1,1]){Nt(e,32+n*14.5,t(26),3,3.4,{base:$u(1.1),rim:rn.gold,rimHi:rn.goldHi,cross:rd({up:2,down:2,side:1,t:2}),seed:9});for(let r=0;r<10;r++){let i=St(e,32+n*(1+(r&1)),t(8+r*2));i>=0&&e.set(32+n*(1+(r&1)),t(8+r*2),i,ed(r,3,4,10))}}for(let n=t(5);n<=t(32);n++)for(let t of[31,32]){let r=St(e,t,n);r>=0&&e.set(t,n,r,n%3==0?td(t,n,r,11):ed(t,n,r,12))}for(let n=t(14);n<=t(30);n+=4)for(let t=22;t<=41;t++){let r=St(e,t,n);r>=0&&e.set(t,n,r,m(wt(rn.plate,t,n,r,13),.82))}for(let n of[-1,1])H(e,32+n*12,t(31),19,5,4.4,7,$u(1.02)),H(e,32+n*13,t(33.5),18.5,3.4,3.4,5.5,$u(1.06)),ot(e,32+n*14.5,t(35),18.5,n*.35,1,-.1,7,2.1,(e,t,n,r)=>r>.6?rn.goldHi:ed(e,t,n,14),.5),ot(e,32+n*10.5,t(34.5),22,n*.15,1,.1,5,1.6,(e,t,n,r)=>r>.6?rn.goldHi:ed(e,t,n,15),.5),H(e,32+n*10.5,t(-4),21,3.6,5.5,8.2,$u(.95)),lt(e,t(-9),t(-8),(e,t,n)=>ed(e,t,n,16),e=>Math.abs(e-(32+n*10.5))<5);for(let n=t(28);n<=t(33);n++)for(let r=18;r<=46;r++){let i=rt(e,r,n);i>=0&&(n===t(28)||n===t(31)&&(r+n)%2==0)&&e.set(r,n,i,td(r,n,i,17))}return be(e,n),e}function od(){let e=new W(48,56,42),t=e.data.slice();H(e,24,19,20,9.6,9.4,10.4,$u(1.02)),H(e,24,15,24,8,9,8.6,$u(1.04)),H(e,24,9.5,25,6,4,6.6,$u(.98));for(let t of[-1,1])H(e,24+t*7.6,14,23,3,7,7,$u(1));H(e,24,15,15,9,10,7,$u(.94)),H(e,24,7,19,8.4,4,7.4,$u(.92)),H(e,24,3.5,21,6.2,3,5.6,nd);for(let t=13;t<=20;t++)for(let n=17;n<=30;n++){let r=rt(e,n,t);if(r<0)continue;let i=Math.abs(n+.5-24);t>=14&&t<=19&&i<=3.4+(t>=17?1.2:0)&&(e.clear(n,t,r),e.set(n,t,r-1,Xe(987414,n,t,r,31,.15)),r-2>=0&&e.set(n,t,r-2,395018))}for(let t of[-1,1])for(let[n,r]of[[1,17],[2,17],[3,18],[4,18]]){let i=t>0?24+n:24-n-1,a=rt(e,i,r);a>=0&&e.set(i,r,a,n<3?rn.glowCore:16777215,!0)}for(let t=16;t<=31;t++)for(let[n,r]of[[13,0],[20,1]]){let i=rt(e,t,n);i>=0&&Math.abs(t+.5-24)<7.4&&Math.abs(t+.5-24)>4.2&&e.set(t,n,i,r?ed(t,n,i,20):td(t,n,i,21))}for(let t of[-1,1])for(let n=12;n<=21;n++){let r=t>0?31:16,i=rt(e,r,n);i>=0&&e.set(r,n,i,ed(r,n,i,22))}for(let t=8;t<=14;t++)for(let n of[23,24]){let r=rt(e,n,t);r>=0&&e.set(n,t,r+1,m(wt(rn.plate,n,t,r,32),1.12))}for(let t of[-5,-3,3,5])for(let n=9;n<=12;n++){let r=24+t-0,i=rt(e,r,n);i>=0&&(e.clear(r,n,i),e.set(r,n,i-1,1711138))}for(let t=19;t<=28;t++){let n=rt(e,t,7);n>=0&&(t+7)%2==0&&e.set(t,7,n,td(t,7,n,23))}Nt(e,24,23.5,3.6,4.2,{base:$u(1.1),rim:rn.gold,rimHi:rn.goldHi,cross:rd({up:3,down:2,side:2,t:2,hy:0}),seed:4});for(let t=11;t<=28;t++){let n=He(e,24,t);if(n<0)continue;let r=Math.max(1,Math.round(4.2-Math.abs(t-20)*.22));for(let i=1;i<=r;i++)for(let a of[23,24])e.set(a,n+i,t,i===r?rn.goldHi:ed(a,n+i,t,24))}ot(e,23.5,He(e,24,27)+1,27,0,1,.5,8,1.9,(e,t,n,r)=>r>.5?rn.goldHi:ed(e,t,n,25),.5);for(let t of[-1,1]){let n=e=>24+t*e;Jt(e,[[n(9),21,22],[n(12.4),26,21],[n(13.4),33,20],[n(11.6),39,19.5],[n(8.4),43,19]],2.3,.7,(e,t,n,r)=>r>.75?rn.goldHi:r%.16<.05?td(e,t,n,26):ed(e,t,n,27)),Jt(e,[[n(10),17,21.5],[n(15),19.5,21],[n(16.4),25,20.5]],1.5,.55,(e,t,n,r)=>r>.7?rn.goldHi:ed(e,t,n,28)),Jt(e,[[n(7),24,18],[n(8.6),29,16],[n(7),33,14.5]],1.2,.5,(e,t,n)=>ed(e,t,n,29))}return be(e,t),e}function sd(){let e=new W(92,72,30),t=new Kt(5521),n=[];for(let e=0;e<40;e++)n.push(t.range(0,1));for(let t=67;t>=2;t--){let r=(67-t)/65,i=15+31*r**.85,a=12+r*4;for(let r=Math.floor(46-i);r<=Math.ceil(46+i);r++){let o=(r+.5-46)/i;if(Math.abs(o)>1)continue;let s=Math.floor((r+100)/3)%40,c=3+(1-Math.abs(o)**1.4)*15+n[s]*15*Math.abs(o)**1.5*0+(n[s]>.55?-2:n[s]*9)+(Math.abs(o)>.8?-5+n[(s+7)%40]*5:0);if(t<c||Math.abs(o)>.35&&(s*13+5)%9==0&&t<c+15+n[s]*8&&(r+100)%3==1)continue;let l=Math.round(a-(1-Math.abs(o)**2)*2+o*o*8),u=.88+.12*Math.sin(r*.55+t*.04),d=Math.abs(o)>1-1.9/i||t<c+1.6||t>65;for(let n=0;n<2;n++){let i=d?n===1?ed(r,t,l,30):td(r,t,l,31):m(wt(rn.plate,r,t,l+n,32),u*(n===0?.9:1));e.set(r,t,l+n,i)}}}return e}function cd(){let e=new W(54,40,10),t=new Kt(3377),n=[];for(let e=0;e<60;e++)n.push(t.range(0,1));let r=(t,n,r,i,a,o,s,c)=>{for(let c=n;c>=0;c--){let l=(n-c)/n,u=r+(i-r)*l;for(let r=Math.floor(t-u);r<=Math.ceil(t+u)-1;r++){let i=r+.5-t;if(Math.abs(i)>u)continue;let l=a(i,r);if(c<l)continue;let d=Math.abs(i)>u-1.6||c<l+1.6||c>n-1.4;for(let t=0;t<s;t++){let n=t===s-1,i=d?n?ed(r,c,o+t,40):td(r,c,o+t,41):m(wt(rn.plate,r,c,o+t,42),n?1.04:.92);e.set(r,c,o+t,i)}}}if(c)for(let l of c)for(let c=-Math.floor(i)+2;c<=Math.floor(i)-2;c++){let u=Math.round(l-Math.abs(c)*.85),d=Math.round(t+c);u<a(c,d)+2||u>n-3||Math.abs(c)>r+(i-r)*((n-u)/n)-2.2||(e.set(d,u,o+s-1,ed(d,u,o+s,43)),e.set(d,u-1,o+s-1,td(d,u,o+s,44)))}},i=(e,t)=>n[(Math.floor(t)+100)%60];r(27,31,8,11.5,(e,t)=>1.5+Math.abs(e)*1.35+i(e,t)*3.5+(Math.floor(t)&3?0:2.5),3,3,[23,17,11]);for(let e of[-1,1])r(27+e*17,28,4.5,6,(e,t)=>9+Math.abs(e)*1+i(e,t+9)*5+(Math.floor(t)%5==0?3:0),1,2,[18,12]);return Nt(e,27,25.5,4.2,4.8,{base:$u(1.08),rim:rn.gold,rimHi:rn.goldHi,cross:rd({up:3,down:3,side:2,t:2}),seed:6}),e}var ld=42,ud=24;function dd(e){let t=new W(44,64,44),n=e,r=t.data.slice();H(t,22+n*2.5,49,22,12.4,7.4,12,$u(1.03)),H(t,22+n*3,44.5,22,12.6,3.2,12,$u(.97)),H(t,22+n*3,41.2,22,11.4,3,11,$u(.92)),H(t,22+n*6,56,21,1.6,6.2,7.2,$u(1.02)),H(t,22,34,22,6.6,9.4,6.4,$u(.96)),H(t,22,24.5,22.4,7.5,4.8,7.3,$u(1)),H(t,22,17.5,22,6.8,6.2,6.7,$u(.98)),H(t,22,10.5,22,7.4,6.2,7.2,$u(1.02)),H(t,22,4.6,22.8,6.4,3.6,6.8,nd);for(let e=0;e<4;e++)H(t,17.5+e*3,3.2,29,1.8,2.8,1.9,(e,t,n)=>Xe(rn.mailHi,e,t,n,50,.08));H(t,22,8.6,23,5.6,1.6,6.4,$u(.9));for(let e=2;e<=7;e+=2)lt(t,e,e,(e,t,n)=>m(nd(e,t,n,1),.7),(e,t,n)=>Math.hypot(e-22,n-22)<7&&t<8);let i=(e,t)=>Math.hypot(e-(22+n*2.8),t-22);lt(t,40,41,(e,t,n)=>ed(e,t,n,51),(e,t,n)=>i(e,n)>10),lt(t,46,47,(e,t,n)=>td(e,t,n,52),(e,t,n)=>i(e,n)>11);for(let e=50;e<=54;e++)lt(t,e,e,(e,t,n)=>t%2?ed(e,t,n,53):td(e,t,n,54),e=>Math.abs(e-(22+n*6))<3);return Ut(t,(e,t)=>t>=52&&Math.abs(e-(22+n*6))<=2,(e,t,n)=>t>60?rn.goldHi:ed(e,t,n,55)),Nt(t,22+n*2.5,49,5.6,5.6,{base:$u(1.1),rim:rn.gold,rimHi:rn.goldHi,cross:rd({up:3,down:3,side:2,t:2}),seed:1}),lt(t,21,22,(e,t,n)=>ed(e,t,n,56),(e,t,n)=>Math.hypot(e-22,n-22)>6.6),lt(t,27,27,(e,t,n)=>td(e,t,n,57),(e,t,n)=>Math.hypot(e-22,n-22)>6.8),lt(t,14,14,(e,t,n)=>td(e,t,n,58),(e,t,n)=>Math.hypot(e-22,n-22)>6.5),lt(t,8,9,(e,t,n)=>ed(e,t,n,59),(e,t,n)=>Math.hypot(e-22,n-22)>6.8),Nt(t,22,17,4.4,6.6,{base:$u(1.1),rim:rn.gold,rimHi:rn.goldHi,cross:rd({up:4,down:3,side:2,t:2}),seed:2}),be(t,r),t}var fd=38,pd=19;function md(){let e=new W(40,46,46),t=e.data.slice();H(e,20,32,17,9.4,9,8.8,$u(1)),H(e,20,25,17,8.4,5.4,8.2,$u(.96)),H(e,20,20.5,20.4,7.5,5.2,6.6,$u(1.04)),H(e,20,13.5,17.5,6.8,7.4,7.2,$u(.98)),H(e,20,8,17.5,6.2,4.6,6.8,$u(.95)),H(e,20,3.4,22.6,7.5,3.5,10.6,$u(.97)),H(e,20,3.1,30,5.2,2.6,4.4,$u(1)),H(e,20,3.6,12.6,6.2,3.5,4.2,$u(.92));for(let t=19;t<=33;t+=3)lt(e,3,5,(e,t,n)=>m(wt(rn.plate,e,t,n,61),.78),(e,n,r)=>r===t);lt(e,0,2,(e,t,n)=>ed(e,t,n,62),(e,t,n)=>n>=29),lt(e,5,5,(e,t,n)=>td(e,t,n,63),(e,t,n)=>n>18),lt(e,6,7,(e,t,n)=>ed(e,t,n,64),(e,t,n)=>Math.hypot(e-20,n-17.5)>5.6),lt(e,11,11,(e,t,n)=>td(e,t,n,65),(e,t,n)=>Math.hypot(e-20,n-17.5)>6.2);for(let t=6;t<=18;t++)for(let n of[19,20]){let r=rt(e,n,t);r>=0&&e.set(n,t,r+1,t%3==0?td(n,t,r,66):ed(n,t,r,67))}lt(e,18,19,(e,t,n)=>ed(e,t,n,68),(e,t,n)=>n>=22);for(let[t,n,r]of[[0,0,0]]){let t=rt(e,20,21);for(let n=-1;n<=0;n++)for(let r=-1;r<=1;r++)e.set(20+n,20+r,t+1,r===0?rn.goldHi:rn.gold)}return lt(e,24,24,(e,t,n)=>td(e,t,n,69),(e,t,n)=>Math.hypot(e-20,n-17)>7.6),lt(e,39,40,(e,t,n)=>ed(e,t,n,70),(e,t,n)=>Math.hypot(e-20,n-17)>8),Nt(e,20,31,5.2,8.4,{base:$u(1.1),rim:rn.gold,rimHi:rn.goldHi,cross:rd({up:5,down:4,side:3,t:2,hy:1}),seed:3}),be(e,t),e}var hd=(e=1,t=5)=>(n,r,i)=>m(wt(sn.plate,n>>1,r>>1,i>>1,t),e*(.94+l(n,r,i,77)*.12)),gd=(e=0)=>(t,n,r,i)=>i>.82?sn.spike[2]:Xe(wt(sn.spike,t,n,r,70+e),t,n,r,71+e,.05),_d=10,vd=new Kt(8801);function yd(){let e=new W(76,66,48),t=e=>e+_d,n=e.data.slice();H(e,38,t(0),24,14,7.5,10,hd(.9)),H(e,38,t(8),24,12.5,7,9.5,hd(.95)),H(e,38,t(15),24.5,14.5,7,10,hd(1)),H(e,38,t(22.5),25,17,9,11.5,hd(1.04));for(let n of[-1,1])H(e,38+n*8,t(23.5),30,8.5,7,6,hd(1.08));H(e,38,t(30),24,19,4.5,10,hd(.96)),H(e,38,t(33.5),24,9.5,3.6,7.6,hd(.9)),H(e,38,t(37),24,6,3,5.4,(e,t,n)=>Xe(sn.steel[3],e,t,n,80,.1)),H(e,38,t(22),18.5,15,10,6,hd(.86));for(let n=0;n<420;n++){let r=Math.round(38+vd.range(-17,17)),i=Math.round(t(vd.range(3,32))),a=rt(e,r,i);if(a<0)continue;let o=4+vd.range(0,5)+(i>t(18)?1.5:0);ot(e,r,i,a,vd.range(-.3,.3),-.8,.6,o,1.7,gd(n&3),.2)}for(let n=t(3);n<=t(30);n+=4)for(let t=21;t<=55;t++){let r=rt(e,t,n);r>=0&&e.set(t,n,r,Xe(sn.edge,t,n,r,81,.08))}for(let n=t(14);n<=t(33);n+=3)for(let t=23;t<=53;t++){let r=St(e,t,n);r>=0&&t+n&1&&e.set(t,n,r,m(wt(sn.plate,t,n,r,83),.8))}for(let n of[-1,1]){for(let r=0;r<6;r++){let i=38+n*(3.5+r*3.6);ot(e,i,t(31+r%2*.5),18.5,n*.25,1,-.75,17-r*1.2-r%2*2,3.8-r*.15,gd(r),.4)}ot(e,38+n*2,t(33),18.5,0,1,-.55,20,4,gd(9),.4);for(let r=0;r<4;r++)ot(e,38+n*(12+r*1.6),t(30-r*4),15.5,n*.8,.2+r*.15,-.9,10-r,2.8,gd(10+r),.4)}ot(e,38,t(24),19,0,1,-.9,13,3.2,gd(8),.4);for(let n of[-1,1]){H(e,38+n*12.5,t(31.5),23.5,6.2,5,8,hd(1.02)),H(e,38+n*11.5,t(-4.5),25,4,6.2,9,hd(.9));for(let r=0;r<6;r++)ot(e,38+n*(11.5+(r-2.5)*.7),t(-7),25+(r-2.5)*3.3,0,-1,.15,6+r%2*3,1.8,gd(20+r),.2)}for(let n=0;n<14;n++)ot(e,38+(n-6.5)*2.4,t(-5.5),31.5,0,-1,.4,3+n%3*1.4,1.1,gd(30+n),.2);return be(e,n),e}function bd(){let e=new W(56,62,48),t=e.data.slice();H(e,28,19,23,10,10,11,hd(1.02)),H(e,28,15,27,8.4,9,9,hd(1.05)),H(e,28,8.5,28,6.4,4.5,7,hd(.9)),H(e,28,14,18,9.5,10,7,hd(.88)),H(e,28,5,23,8.8,4,7.6,hd(.82)),H(e,28,3,24,6,3,5.6,(e,t,n)=>Xe(sn.steel[3],e,t,n,84,.1));for(let t=14;t<=20;t++)for(let n=20;n<=35;n++){let r=rt(e,n,t);if(r<0)continue;let i=Math.abs(n+.5-28);(t>=16&&t<=19&&i<=6||t===15&&i<=3)&&(e.clear(n,t,r),e.set(n,t,r-1,328966),r-2>=0&&e.set(n,t,r-2,131587))}for(let t of[-1,1])for(let n=0;n<4;n++){let r=t>0?30+n:25-n,i=17+ +(n>=2)+0,a=rt(e,r,i);a>=0&&e.set(r,i,a,n<2?sn.glowHi:sn.glow,!0);let o=rt(e,r,i+1);o>=0&&n>=1&&e.set(r,i+1,o,sn.glow,!0)}for(let t=7;t<=13;t++)for(let n of[-4,-2,1,3]){let r=28+n,i=rt(e,r,t);i>=0&&(e.clear(r,t,i),e.set(r,t,i-1,723725))}for(let t=12;t<=22;t++)for(let n of[27,28]){let r=rt(e,n,t);r>=0&&(t<14||t>19)&&e.set(n,t,r+1,Xe(sn.edge,n,t,r,85,.08))}for(let t=0;t<9;t++){let n=-1+t*.25,r=8.5,i=28+Math.sin(n*1.5)*r,a=23+Math.cos(n*1.5)*r*.45-2,o=10+(t===4?8:t%2?-1:3)+vd.range(0,2);ot(e,i,26.5,a,Math.sin(n*1.5)*.9,1,-.2+n*.2,o,3.1,gd(40+t),.4)}for(let t of[-1,1]){for(let n=0;n<3;n++)ot(e,28+t*(9.5+n*.6),19+n*3.2,23-n*1.2,t*1,.55,-.15,6-n,2,gd(50+n),.4);ot(e,28+t*6,22.5,30.5,t*.35,1,.4,5,1.7,gd(55),.4),ot(e,28+t*8.5,11,25.5,t*.9,-.5,.2,5,1.8,gd(56),.4)}for(let t=0;t<5;t++)ot(e,28+(t-2)*3.4,22,16,0,.7,-1,8-Math.abs(t-2)*1.4,1.9,gd(60+t),.4);return be(e,t),e}function xd(){let e=new W(64,44,16),t=new Kt(6609);for(let n=0;n<2;n++){let r=n===0?11:9;for(let i=0;i<r;i++){let a=32+(i-(r-1)/2)*(n===0?4.6:5.4)+t.range(-.6,.6),o=(n===0?24:34)+t.range(0,8)-Math.abs(i-(r-1)/2)*1.5,s=n===0?3.6:3.4,c=n===0?8:5;for(let t=43;t>43-o;t--){let r=(43-t)/o,i=Math.max(.3,s*(1-r*.92));for(let o=Math.floor(a-i);o<=Math.ceil(a+i);o++){if(Math.abs(o+.5-a)>i)continue;let s=r>.8?sn.spike[2]:Xe(wt(sn.plate,o>>1,t>>1,n,90),o,t,n,91,.06);e.set(o,t,c+ +(Math.abs(o-a)<1),m(s,n===0?1.12:.9)),Math.abs(o+.5-a)<i*.4&&e.set(o,t,c+2,m(s,1.08))}}}}for(let t=4;t<60;t++)for(let n=41;n<=43;n++)e.set(t,n,7,t+n&1?sn.plate[2]:sn.plate[1]);return e}function Sd(e){let t=new W(52,66,48),n=e,r=t.data.slice();H(t,26+n*3,50,24,14,8.4,13,hd(1.04)),H(t,26+n*3.5,44.5,24,14.6,3.4,13.6,hd(.96)),H(t,26+n*3,41.2,24,12.4,3,11.8,hd(.9)),H(t,26,34,24,7,9.6,6.8,hd(.94)),H(t,26,24.5,24.5,8.4,5.2,8,hd(1.02)),H(t,26,17.5,24,7.4,6.4,7.2,hd(.96)),H(t,26,10.5,24,8.2,6.4,7.8,hd(1)),H(t,26,4.6,24.8,7,3.8,7.2,(e,t,n)=>Xe(sn.steel[0],e,t,n,95,.1));let i=(e,n,r,i,a,o,s,c,l)=>ot(t,e,n,r,i,a,o,s,c,gd(l),.4);for(let e=0;e<7;e++){let t=e/6*Math.PI;i(26+n*3+Math.cos(t)*n*10,53+Math.sin(t)*4,24+(e%2?2:-3),n*Math.cos(t)*.9,.5+Math.sin(t),0,15-Math.abs(e-3)*2,3.5,100+e)}i(26+n*3,56,24,0,1,0,20,4,120),i(26+n*3,54,30,0,.8,.8,13,3.2,121),i(26+n*3,54,18,0,.8,-.8,13,3.2,122);for(let e=0;e<5;e++)i(26+n*(8+e*1.2),46-e*1.5,24+(e-2)*3.6,n*1,-.1,(e-2)*.2,9-e*.5,2.6,130+e);i(26,27,30.5,0,.3,1,8,2.8,140),i(26,20.5,30,0,.1,1,5,1.8,141);for(let e of[20,28])i(26+n*5.5,12,e,n*1,.4,0,6,1.7,142);lt(t,21,21,(e,t,n)=>Xe(sn.edge,e,t,n,96,.08),(e,t,n)=>Math.hypot(e-26,n-24)>6.8),lt(t,8,9,(e,t,n)=>Xe(sn.edge,e,t,n,97,.08),(e,t,n)=>Math.hypot(e-26,n-24)>7),lt(t,14,14,(e,t,n)=>Xe(sn.steel[0],e,t,n,98,.08),(e,t,n)=>Math.hypot(e-26,n-24)>6.8);for(let e=0;e<4;e++)H(t,21+e*3.3,3,31,1.8,2.6,1.9,(e,t,n)=>Xe(sn.steel[2],e,t,n,99,.08));return be(t,r),t}function Cd(){let e=new W(46,50,52),t=e.data.slice();H(e,23,33,19,10.4,9.4,9.8,hd(1)),H(e,23,26,19,9.4,5.6,9,hd(.94)),H(e,23,20.5,22.6,8.6,5.4,7.2,hd(1.06)),H(e,23,13.5,19.5,7.8,7.6,8,hd(.96)),H(e,23,8,19.5,7.2,4.8,7.6,hd(.92)),H(e,23,3.6,25,8.6,3.8,12,hd(.9)),H(e,23,3.2,33,6,2.8,5,hd(.96)),H(e,23,3.8,14.6,7,3.6,4.6,hd(.84));let n=(t,n,r,i,a,o,s,c,l)=>ot(e,t,n,r,i,a,o,s,c,gd(l),.4);n(23,21,28,0,.35,1,10,3.4,150),n(19,22,27,-.4,.5,1,6,2,151),n(27,22,27,.4,.5,1,6,2,152);for(let e of[-1,1])n(23+e*9,30,19,e,.5,0,8,2.6,153+e),n(23+e*8.4,12,19,e,.3,0,6,2,156+e),n(23+e*7,4,28,e,.2,1,5,1.8,158+e);for(let e=0;e<5;e++)n(23+(e-2)*2.4,4.5,36,0,.1,1,4-Math.abs(e-2)*.5,1.4,160+e);for(let t=20;t<=35;t+=4)lt(e,3,5,(e,t,n)=>m(Xe(sn.plate[0],e,t,n,161,.1),.7),(e,n,r)=>r===t);return lt(e,6,7,(e,t,n)=>Xe(sn.edge,e,t,n,162,.08),(e,t,n)=>Math.hypot(e-23,n-19.5)>6.6),lt(e,18,19,(e,t,n)=>Xe(sn.edge,e,t,n,163,.08),(e,t,n)=>n>=24),lt(e,39,40,(e,t,n)=>Xe(sn.steel[0],e,t,n,164,.1),(e,t,n)=>Math.hypot(e-23,n-19)>9),be(e,t),e}var wd={pos:[-.66,.2,.74],dir:[-.12,1,.12]};function Td(){let e=e=>Sd(e);Object.assign(e,{cx:26,pivot:42,cz:24,elbow:24,sx:21,sy:27,sz:0,handY:4});let t=()=>Cd();Object.assign(t,{cx:23,pivot:38,cz:19,knee:19,sx:8.6,sy:1.22});let n=Ed({hipY:46.36,torso:jd(yd(),38,_d,24),head:{...jd(bd(),28,5,24),pos:[0,32,.5]},arm:e,leg:t,cloth:{pos:[0,8,12.5],parts:[jd(xd(),32,43,8)]}});n.dims={upperArm:18*Qu,foreArm:20*Qu};let r=I(`demonsword`),i=new V;r.scale.setScalar(.78),i.add(r),n.parts.body.add(i),n.parts.weapon=i;let a=ft(`demonset`),o=R(a.M,a.ox,a.oy,a.oz,at({vertexColors:!0}),a.size);o.rotation.x=Math.PI/2,o.scale.setScalar(2.05);let s=new V;s.add(o),s.position.set(1,.02,.5),s.rotation.y=.22,n.parts.body.add(s),n.parts.shield=s;let c=new j().setFromAxisAngle(new jt(0,0,1),Ge(`demonsword`));return n.holdGear=(e=wd)=>{i.position.set(...e.pos),i.quaternion.copy(Pd(e.dir,e.face||[0,0,1])).multiply(c);let t=Dd(0,0,.0936).applyQuaternion(i.quaternion).add(i.position);kd(n,`L`,t,Dd(-.8,-.5,-.3));let r=Dd(.78,.18,.28);kd(n,`R`,r,Dd(.9,-.6,-.2))},n.holdGear(),n}function Ed(e){let n=at({vertexColors:!0,emissive:new N(0)}),r=new V,i=new V;i.position.y=e.hipY*Qu,r.add(i);let a=new V;i.add(a),a.add(R(e.torso.M,e.torso.ox,e.torso.oy,e.torso.oz,n,Qu));let o=new V;o.position.set(...e.head.pos.map(e=>e*Qu)),o.add(R(e.head.M,e.head.ox,e.head.oy,e.head.oz,n,Qu)),a.add(o);let s={};for(let r of[-1,1]){let i=e.arm(r),o=t(i,e.arm.cx,e.arm.pivot,e.arm.cz,n,e.arm.elbow),c=new V;c.position.set(r*e.arm.sx*Qu,e.arm.sy*Qu,e.arm.sz*Qu);let l=new V;l.position.y=-(e.arm.pivot-e.arm.elbow)*Qu,l.add(o.lower),c.add(o.upper,l),a.add(c);let u=new V;u.position.set(0,(e.arm.handY-e.arm.elbow)*Qu,0),l.add(u),s[r<0?`armL`:`armR`]={shoulder:c,elbow:l,hand:u}}for(let r of[-1,1]){let a=e.leg(r),o=t(a,e.leg.cx,e.leg.pivot,e.leg.cz,n,e.leg.knee),c=new V;c.position.set(r*e.leg.sx*Qu,0,0),c.scale.y=e.leg.sy||1;let l=new V;l.position.y=-(e.leg.pivot-e.leg.knee)*Qu,l.add(o.lower),c.add(o.upper,l),i.add(c),s[r<0?`legL`:`legR`]={thigh:c,knee:l}}let c=new V;c.position.set(...e.cloth.pos.map(e=>e*Qu)),c.scale.y=e.leg.sy||1;for(let t of e.cloth.parts)c.add(R(t.M,t.ox,t.oy,t.oz,n,Qu));i.add(c);let l=null;return e.cape&&(l=new V,l.position.set(...e.cape.pos.map(e=>e*Qu)),l.add(R(e.cape.M,e.cape.ox,e.cape.oy,e.cape.oz,n,Qu)),a.add(l)),r.traverse(e=>{e.isMesh&&(e.frustumCulled=!0)}),{root:r,mat:n,parts:{hip:i,body:a,head:o,cloth:c,cape:l,armL:s.armL.shoulder,armR:s.armR.shoulder,elbowL:s.armL.elbow,elbowR:s.armR.elbow,handL:s.armL.hand,handR:s.armR.hand,legL:s.legL.thigh,legR:s.legR.thigh,kneeL:s.legL.knee,kneeR:s.legR.knee}}}var Dd=(e=0,t=0,n=0)=>new jt(e,t,n),Od=Dd(0,-1,0);function kd(e,t,n,r){let i=e.parts[t===`L`?`armL`:`armR`],a=e.parts[t===`L`?`elbowL`:`elbowR`],o=e.dims.upperArm,s=e.dims.foreArm,c=i.position,l=n.clone().sub(c),u=l.length(),d=(o+s)*.995;u>d&&(l.multiplyScalar(d/u),u=d);let f=l.clone().normalize(),p=(o*o-s*s+u*u)/(2*u),m=Math.sqrt(Math.max(0,o*o-p*p)),h=r.clone().sub(f.clone().multiplyScalar(r.dot(f))).normalize(),g=f.clone().multiplyScalar(p).add(h.multiplyScalar(m)),_=new j().setFromUnitVectors(Od,g.clone().normalize());i.quaternion.copy(_);let v=l.clone().sub(g).normalize(),y=new j().setFromUnitVectors(Od,v);a.quaternion.copy(_.clone().invert().multiply(y))}function Ad(e,t,n=.015){return Dd(0,0,t*n*e.scale.x).applyQuaternion(e.quaternion).add(e.position)}var jd=(e,t,n,r)=>({M:e,ox:t,oy:n,oz:r});function Md(){let e=e=>dd(e);Object.assign(e,{cx:22,pivot:ld,cz:22,elbow:ud,sx:19.5,sy:26,sz:0,handY:4});let t=()=>md();Object.assign(t,{cx:20,pivot:fd,cz:17,knee:pd,sx:8,sy:1.22});let n=Ed({hipY:46.36,torso:jd(ad(),32,id,20),head:{...jd(od(),24,5,21),pos:[0,31,.5]},arm:e,leg:t,cloth:{pos:[0,3,10.5],parts:[jd(cd(),27,31,3)]},cape:{...jd(sd(),46,67,9),pos:[0,29,-11]}});n.dims={upperArm:18*Qu,foreArm:20*Qu};let r=I(`holyhammer`);r.scale.setScalar(1.55);let i=new V;return i.add(r),n.parts.body.add(i),n.parts.weapon=i,n.holdHammer=(e=Nd)=>{i.position.set(...e.pos),i.quaternion.copy(Pd(e.dir,e.face)),i.scale.setScalar(1);let t=Ad(r,44,.015).applyQuaternion(i.quaternion).add(i.position),a=Ad(r,6,.015).applyQuaternion(i.quaternion).add(i.position);kd(n,`L`,t,Dd(-.7,-.4,-.5)),kd(n,`R`,a,Dd(.9,-.4,-.3))},n.holdHammer(),n}var Nd={pos:[.3,.4,.62],dir:[-.8,.52,.3],face:[0,0,1]};function Pd(e,t){let n=Dd(...e).normalize(),r=new j().setFromUnitVectors(Dd(0,0,1),n),i=Dd(0,1,0).applyQuaternion(r),a=Dd(...t);a.sub(n.clone().multiplyScalar(a.dot(n))).normalize();let o=Math.acos(Math.min(1,Math.max(-1,i.dot(a))));return i.clone().cross(a).dot(n)<0&&(o=-o),new j().setFromAxisAngle(n,o).multiply(r)}var Fd=Math.PI*2,Id=7321855,Ld=16726554,Rd=[16773296,16765562,16777215,10473727],zd=[16726554,16747050,16765562,3803656],Bd=new Set([`wind`,`strike`,`dash`,`recover`]),Vd=e=>e===`wind`||e===`dash`,Hd={smash:{wind:.78,strike:.4,recover:.75},smite:{wind:1,strike:.35,recover:.7},cleave:{wind:.62,strike:.34,recover:.6},rush:{wind:.55,dash:.46,recover:.8},hellfire:{wind:.9,strike:.36,recover:.75}},Ud=e=>e.enraged||e.puppet&&e.hp<e.maxHp*.5?1.3:1,Wd=(e,t)=>{let n=(Hd[e.atk]||Hd.smash)[t]||.5;return t===`wind`?n/Ud(e):n};function Gd(e,t){let n=(t-e)%Fd;return n>Math.PI&&(n-=Fd),n<-Math.PI&&(n+=Fd),n}var Kd=(e,t,n,r)=>{e.yaw+=z(Gd(e.yaw,t),-n*r,n*r)};function qd(e,t,n){let r=e.game;if(e.atk=t,e.state=`wind`,e.t=0,e.hitDone=!1,e.fireAcc=0,t===`smash`)e.warn(`circle`,3.5,0,Wd(e,`wind`)+.05),e.teleCenter=!0,r.audio.tone(140,.6,`triangle`,.1,120);else if(t===`smite`){e.mark={x:n.pos.x,z:n.pos.z};let t=r.world.heightAt(e.mark.x,e.mark.z);e.teleSlot=r.fx.telegraph(e.mark.x,t,e.mark.z,0,`circle`,2.5,0,Id,Wd(e,`wind`)+.05),e.teleSlot.owner=e,e.teleKind=`dive`,r.audio.tone(520,.9,`sine`,.09,300)}else t===`cleave`?(e.warn(`line`,3.6,4,Wd(e,`wind`)),r.audio.tone(90,.4,`sawtooth`,.1,-30)):t===`rush`?(e.warn(`line`,2.3,7.5,Wd(e,`wind`)),r.audio.tone(110,.5,`sawtooth`,.1,60)):(e.warn(`line`,2.3,11.5,Wd(e,`wind`)),r.audio.tone(70,.9,`sawtooth`,.1,140))}function Jd(e,t){let n=Math.random(),r=e.type===`holyknight`,i=e.type===`keepwarden`,a=null;return i?t<4.4?a=n<.34?`smash`:n<.62?`cleave`:n<.82?`rush`:`hellfire`:t<12&&(a=n<.45?`smite`:n<.8?`hellfire`:`rush`):r?t<4.4?a=n<.62?`smash`:`smite`:t<12&&(a=n<.7?`smite`:null):t<4.1?a=n<.55?`cleave`:n<.78?`rush`:`hellfire`:t<11&&(a=n<.45?`rush`:n<.9?`hellfire`:null),a&&a===e.lastAtk&&Math.random()<.6&&(a=i?a===`smite`?`hellfire`:a===`hellfire`?`smash`:`smite`:r?a===`smash`?`smite`:`smash`:a===`cleave`?`hellfire`:`cleave`),a}var Yd=(e,t,n,r,i,a,o,s)=>t.dead||Math.hypot(t.pos.x-n,t.pos.z-r)>i||t.pos.y>e.y+3.2||!t.hurt(a,e.x,e.z,o)?!1:(e.game.fx.burst(t.pos.x,t.pos.y+1.1,t.pos.z,s,10,3.4,.09,.4),!0);function Xd(e,t){let n=e.game,r=Math.sin(e.yaw),i=Math.cos(e.yaw),a=e.def.dmg;if(e.atk===`smash`){let o=e.x+r*2.4,s=e.z+i*2.4,c=n.world.heightAt(o,s);n.fx.shockwave(o,c,s,16773328,3.6),n.fx.ring(o,c+.25,s,Id,26,6.6,.12,.55),n.fx.ring(o,c+.5,s,16765562,18,4.4,.1,.45),n.fx.burst(o,c+.6,s,Rd,24,5,.14,.9,7,3),n.vfx.glow(o,c+.8,s,Id,5.5,.4,{grow:.8}),n.shake(.4),n.punch(.3),n.audio.tone(55,.5,`square`,.18,-20),Yd(e,t,o,s,3.5,a+2,11,Rd)}else if(e.atk===`smite`){let{x:r,z:i}=e.mark,o=n.world.heightAt(r,i);n.fx.ring(r,o+.2,i,Id,22,5,.12,.5),n.vfx.glow(r,o+1.2,i,16777215,6,.4,{grow:.4});for(let e=0;e<26;e++)n.fx.emit(r+(Math.random()-.5)*1.8,o+Math.random()*.8,i+(Math.random()-.5)*1.8,0,6+Math.random()*6,0,Rd[e&3],.16,.8,-2);n.fx.shockwave(r,o,i,16773328,2.6),n.shake(.3),n.audio.tone(900,.5,`sine`,.12,-600),Yd(e,t,r,i,2.5,a+3,7,Rd)}else if(e.atk===`cleave`){n.vfx.slashArc(e.x+r*.4,e.y+1.6,e.z+i*.4,e.yaw,{radius:3.6,thick:1.7,sweep:3,color:Ld,hot:16765088,tilt:.3,life:.34,sweepT:.16,tail:.9}),n.fx.burst(e.x+r*2.3,e.y+1,e.z+i*2.3,zd,14,4,.1,.6,3,2),n.shake(.2),n.audio.tone(170,.2,`square`,.12,-120);let o=t.pos.x-e.x,s=t.pos.z-e.z;Math.abs(Gd(e.yaw,Math.atan2(o,s)))<1.25&&Yd(e,t,e.x,e.z,3.7,a+1,9,zd)}}function Zd(e,t,n){let r=e.game,i=Math.sin(e.yaw),a=Math.cos(e.yaw);e.fireAcc+=n;let o=z(e.t/.3,0,1),s=1.5+10.5*o;for(let t=0;t<6;t++){let t=1.4+Math.random()*(s-1.4),n=e.x+i*t+(Math.random()-.5)*1.6,o=e.z+a*t+(Math.random()-.5)*1.6;r.fx.emit(n,r.world.heightAt(n,o)+.15,o,0,2.5+Math.random()*3.5,0,zd[Math.random()*3|0],.2,.55,-1)}if(!e.hitDone&&o>.15){let n=t.pos.x-e.x,s=t.pos.z-e.z,c=n*i+s*a,l=Math.abs(n*a-s*i);c>.5&&c<1.5+10.5*o&&l<1.35&&t.pos.y<e.y+2.4&&(e.hitDone=!0,t.hurt(e.def.dmg+1,e.x,e.z,7),r.fx.burst(t.pos.x,t.pos.y+1,t.pos.z,zd,12,3.6,.1,.5))}}function Qd(e,t,n){let{g:r,P:i,dx:a,dz:o,dist:s,sees:c,toP:l}=n,u=e.type===`holyknight`,d=Ud(e),f=e.def.speed*(d>1?1.2:1),p=0,m=0,h=e.state,g=Math.hypot(e.x-e.home.x,e.z-e.home.z);if(h===`idle`||h===`wander`){if(c&&g<46)e.state=`chase`,e.cd=Math.min(e.cd,.9),r.hud.floatText(...r.screenOf(e.x,e.y+3.6,e.z),u?`For the Light!`:`Burn it all!`,`crit`),r.audio.tone(u?330:80,.5,u?`sine`:`sawtooth`,.1,u?220:-20);else{if(e.wanderT-=t,e.wanderT<=0){e.wanderT=2.4+Math.random()*3;let t=Math.random()*Fd,n=2+Math.random()*8;e.target={x:e.home.x+Math.cos(t)*n,z:e.home.z+Math.sin(t)*n}}let n=e.target.x-e.x,r=e.target.z-e.z,i=Math.hypot(n,r);i>.8&&(p=n/i*.9,m=r/i*.9,Kd(e,Math.atan2(n,r),2.6,t))}}else if(h===`chase`){if(!c&&s>e.def.aggro*1.5?e.state=`idle`:g>60&&(e.state=`idle`,e.target={x:e.home.x,z:e.home.z}),Kd(e,l,4.4,t),s>2.3&&(p=a/s*f,m=o/s*f),e.cd<=0){let t=Jd(e,s);t?qd(e,t,i):e.cd=.4}}else if(h===`wind`){let n=e.atk===`smite`?1.6:e.atk===`hellfire`?3.4:6;if(e.atk===`smite`&&e.t<.45){e.mark.x+=(i.pos.x-e.mark.x)*Math.min(1,t*5),e.mark.z+=(i.pos.z-e.mark.z)*Math.min(1,t*5);let n=e.teleSlot;n&&n.owner===e&&n.active&&n.mesh.position.set(e.mark.x,r.world.heightAt(e.mark.x,e.mark.z)+.1,e.mark.z)}Kd(e,l,n,t),(e.atk===`smash`||e.atk===`cleave`)&&s>2.6&&(p=a/s*f*.3,m=o/s*f*.3),e.t>Wd(e,`wind`)&&(e.clearWarn(),e.t=0,e.hitDone=!1,e.fireAcc=0,e.atk===`rush`?(e.state=`dash`,r.audio.tone(70,.4,`square`,.12,100)):(e.state=`strike`,e.atk===`hellfire`?(r.fx.ring(e.x+Math.sin(e.yaw)*1.2,e.y+.3,e.z+Math.cos(e.yaw)*1.2,Ld,14,3.4,.1,.4),r.shake(.25),r.audio.tone(60,.5,`square`,.16,-10)):Xd(e,i)))}else if(h===`strike`)e.atk===`hellfire`&&Zd(e,i,t),e.t>Wd(e,`strike`)&&(e.state=`recover`,e.t=0);else if(h===`dash`){let n=13.5*d;p=Math.sin(e.yaw)*n,m=Math.cos(e.yaw)*n,Math.random()<t*40&&r.fx.dust(e.x,e.y,e.z,1,1.4,6969944),!e.hitDone&&s<e.radius+1.35&&(e.hitDone=!0,!i.dead&&i.hurt(e.def.dmg+2,e.x,e.z,13)&&r.fx.burst(i.pos.x,i.pos.y+1,i.pos.z,zd,12,3.6,.1,.5),r.shake(.3),r.fx.ring(e.x+Math.sin(e.yaw)*1.3,e.y+.5,e.z+Math.cos(e.yaw)*1.3,Ld,14,3.4,.1,.4)),(e.t>Wd(e,`dash`)||e.hitDone)&&(e.state=`recover`,e.t=0)}else h===`recover`&&e.t>Wd(e,`recover`)/(d>1?1.25:1)&&(e.state=`chase`,e.cd=(u?1.1:.9)+Math.random()*.8-(d>1?.3:0));return[p,m]}var $d=(e,t,n)=>e.map((e,r)=>e+(t[r]-e)*n),ef=e=>e*e*(3-2*e),tf={guard:{pos:[.3,.4,.62],dir:[-.8,.52,.3]},raise:{pos:[.05,.95,.05],dir:[-.12,1,-.3]},slam:{pos:[0,.5,.35],dir:[.04,-.5,1]},pillar:{pos:[0,1.05,.2],dir:[0,1,.05]}},nf={guard:{pos:[-.66,.2,.74],dir:[-.12,1,.12]},back:{pos:[-.85,.75,-.1],dir:[-.85,.6,-.6]},swept:{pos:[.35,.4,.95],dir:[.95,.15,.55]},raise:{pos:[-.35,.9,.2],dir:[-.1,1,-.2]},plunge:{pos:[-.1,.35,.9],dir:[0,-.35,1]},hip:{pos:[-.8,.45,.3],dir:[-.5,.5,-.8]}},rf=(e,t,n,r)=>{let i=ef(z(r,0,1));return{pos:$d(e[t].pos,e[n].pos,i),dir:$d(e[t].dir,e[n].dir,i),face:[0,0,1]}};new jt;function af(e,t,n){let{spd:r,t:i,hk:a,spawnS:o}=n,s=e.model.parts,c=e.type===`holyknight`,l=Math.min(1,r/2.6);e.gaitC=(e.gaitC||0)+t*(2.8+r*1.7);let u=e.gaitC,d=Math.min(1,t*12),f=Math.sin(u)*.55*l,p=Math.sin(u+Math.PI)*.55*l;s.legL.rotation.x+=(f-s.legL.rotation.x)*d,s.legR.rotation.x+=(p-s.legR.rotation.x)*d,s.kneeL.rotation.x+=(Math.max(0,f)*1.15-s.kneeL.rotation.x)*d,s.kneeR.rotation.x+=(Math.max(0,p)*1.15-s.kneeR.rotation.x)*d;let m=e.state===`dead`?`idle`:e.state,h=e.atk||`smash`,g=t=>m===t?Wd(e,t):1,_=z(e.t/(m===`wind`?g(`wind`):m===`strike`?g(`strike`):m===`dash`?g(`dash`):m===`recover`?g(`recover`):1),0,1),v=.04+l*.05,y=0,b,x=0,S=Math.sin(i*1.7)*.012;if(c?(m===`wind`?(b=rf(tf,`guard`,h===`smite`?`pillar`:`raise`,_),v=-.12*_):m===`strike`?(b=rf(tf,h===`smite`?`pillar`:`raise`,`slam`,Math.min(1,_*4)),v=-.12+.55*Math.min(1,_*4)):m===`recover`?(b=rf(tf,`slam`,`guard`,_),v=.38*(1-_)):b={pos:tf.guard.pos.map((e,t)=>e+(t===1?Math.sin(i*1.6)*.012:0)),dir:tf.guard.dir,face:[0,0,1]},s.body.userData.pose=b,e.model.holdHammer(b)):(m===`wind`?h===`cleave`?(b=rf(nf,`guard`,`back`,_),y=.6*_):h===`rush`?(b=rf(nf,`guard`,`hip`,_),x=.18*_,v=.25*_):(b=rf(nf,`guard`,`raise`,_),v=-.1*_):m===`strike`?h===`cleave`?(b=rf(nf,`back`,`swept`,Math.min(1,_*3.5)),y=.6-1.3*Math.min(1,_*3.5)):(b=rf(nf,`raise`,`plunge`,Math.min(1,_*4)),v=-.1+.5*Math.min(1,_*4)):m===`dash`?(b=rf(nf,`guard`,`hip`,1),x=.32,v=.32):m===`recover`?(b=rf(nf,h===`cleave`?`swept`:h===`rush`?`hip`:`plunge`,`guard`,_),y=h===`cleave`?-.7*(1-_):0,v=.2*(1-_)):b={pos:nf.guard.pos.map((e,t)=>e+(t===1?Math.sin(i*1.4)*.01:0)),dir:nf.guard.dir,face:[0,0,1]},e.model.parts.weapon,e.model.holdGear(b),s.shield.position.z+=(.5+x-s.shield.position.z)*d,s.shield.rotation.y+=(.22-s.shield.rotation.y)*d),s.body.rotation.x+=(v+S-s.body.rotation.x)*Math.min(1,t*9),s.body.rotation.y+=(y-s.body.rotation.y)*Math.min(1,t*14),s.body.rotation.z=Math.sin(u)*.03*l,s.head.rotation.y+=(n.lookSm*.6-s.head.rotation.y-s.body.rotation.y*.5)*Math.min(1,t*8),s.head.rotation.x+=((m===`chase`?.04:-.06)-s.head.rotation.x)*d,s.cloth.rotation.x=Math.sin(u*2)*.05*l+Math.sin(i*2)*.02,s.cape&&(s.cape.rotation.x=.06+l*.2+Math.sin(i*1.6)*.04+Math.sin(u*2)*.05*l),!c&&Math.random()<t*9){let t=e.game,n=e.yaw+(Math.random()<.5?1.6:-1.6);t.fx.emit(e.x+Math.sin(n)*.75,e.y+2.4+Math.random()*.6,e.z+Math.cos(n)*.75,0,.9+Math.random()*.7,0,[3816002,5592414,2763312][Math.random()*3|0],.2,1.6,-.3)}if(c&&Math.random()<t*5){let t=e.game,n=Math.random()*Fd;t.fx.emit(e.x+Math.cos(n)*.9,e.y+.6+Math.random()*2.2,e.z+Math.sin(n)*.9,0,.6,0,[16773296,10473727][Math.random()*2|0],.09,1.1,-.2)}return{rootY:Math.abs(Math.sin(u))*.04*l,rootX:0}}var of=Math.PI*2,sf=8376575,cf=[12577535,8376575,16777215,15137279],lf=new Set([`rakewind`,`breathwind`,`slamwind`,`hurlwind`]),uf=new Set([...lf,`rake1`,`rake2`,`rake3`,`breath`,`leap`,`land`,`hurl`,`roar`,`recover`]),df=new Set([...lf,`leap`]),ff=e=>df.has(e),pf={rakewind:.62,rake1:.3,rake2:.36,rake3:.8,breathwind:.85,breath:1.3,slamwind:.72,land:.55,hurlwind:.95,hurl:.5,roar:1,recover:.6};function mf(e){return e.enraged||e.puppet&&e.hp<e.maxHp*.5?1.28:1}function hf(e,t){let n=pf[t]||.5;return lf.has(t)?n/mf(e):n}function gf(e,t){let n=(t-e)%of;return n>Math.PI&&(n-=of),n<-Math.PI&&(n+=of),n}var _f=(e,t,n,r)=>{e.yaw+=z(gf(e.yaw,t),-n*r,n*r)},vf=(e,t)=>{e.vx+=Math.sin(e.yaw)*t,e.vz+=Math.cos(e.yaw)*t};function yf(e,t,n,r,i,a,o=e.x,s=e.z){if(t.dead)return!1;let c=t.pos.x-o,l=t.pos.z-s;if(Math.hypot(c,l)>r||t.pos.y>e.y+3.2||i<Math.PI&&Math.abs(gf(e.yaw,Math.atan2(c,l)))>i)return!1;let u=e.game;return t.hurt(n,e.x,e.z,a)?(u.fx.burst(t.pos.x,t.pos.y+1.1,t.pos.z,[15137279,10476799,16777215],10,3.4,.09,.4),t.chill?.(1.4),!0):!1}function bf(e,t,n={}){e.game.vfx.slashArc(e.x+Math.sin(e.yaw)*.5,e.y+2.1,e.z+Math.cos(e.yaw)*.5,e.yaw,{radius:3.1,thick:1.5,sweep:2.5,color:9426175,hot:16777215,tilt:t,life:.3,sweepT:.15,forward:0,...n})}function xf(e,t,n,r){let i=e.game;if(e.atk=t,e.lastAtk=t,e.t=0,e.hitDone=!1,e.fireAcc=0,t===`rake`)e.state=`rakewind`,e.warn(`line`,3.4,4.3,hf(e,`rakewind`)),i.audio.tone(80,.3,`sawtooth`,.09,-30);else if(t===`breath`)e.state=`breathwind`,e.warn(`line`,5.4,9.5,hf(e,`breathwind`)),i.audio.tone(200,.7,`sine`,.09,160);else if(t===`slam`){e.state=`slamwind`;let t=Math.min(14,r),a=Math.atan2(n.pos.x-e.x,n.pos.z-e.z),o=e.x+Math.sin(a)*t,s=e.z+Math.cos(a)*t;e.dive={x:o,z:s};let c=i.world.heightAt(o,s);e.teleSlot=i.fx.telegraph(o,c,s,0,`circle`,4,0,sf,hf(e,`slamwind`)+.55),e.teleSlot.owner=e,e.teleKind=`dive`,i.audio.tone(110,.6,`sawtooth`,.09,-50)}else e.state=`hurlwind`,i.audio.tone(140,.9,`triangle`,.1,120)}function Sf(e,t,n){let r=Math.random(),i=e.lastAtk,a=null;return t<4.2?a=r<.55?`rake`:r<.78?`slam`:`breath`:t<8?a=r<.34?`slam`:r<.68?`breath`:`hurl`:t<17&&(a=r<.55?`hurl`:r<.8&&t<10.5?`breath`:null),a&&a===i&&a!==`rake`&&Math.random()<.7&&(a=t<6?`rake`:`hurl`),a===`rake`&&t>4.4&&(a=`slam`),a}function Cf(e,t){let n=e.game,r=mf(e)>1?3:1,i=Math.atan2(t.pos.x-e.x,t.pos.z-e.z),a=Math.hypot(t.pos.x-e.x,t.pos.z-e.z),o=z(a/11,.85,1.35),s=e.y+4,c=e.x+Math.sin(i)*.9,l=e.z+Math.cos(i)*.9,u=.45,d=t.vel?.x||0,f=t.vel?.z||0;for(let a=0;a<r;a++){let r=a===0?0:(a===1?-1:1)*3.6,p=t.pos.x+d*u+Math.cos(i)*r,m=t.pos.z+f*u-Math.sin(i)*r,h=n.world.heightAt(p,m),g=(h+.1-s+8*o*o)/o;n.spawnProjectile({owner:`enemy`,kind:`iceboulder`,x:c,y:s,z:l,vx:(p-c)/o,vz:(m-l)/o,vy:g,gravity:16,dmg:e.def.dmg,life:o+1,r:.8});let _=n.fx.telegraph(p,h,m,0,`circle`,2.5,0,sf,o);e.strikes.push({kind:`boulder`,x:p,z:m,gy:h,t:0,dur:o,slot:_,r:2.5})}n.fx.burst(c,s,l,[15137279,8376575,16777215],14,3.4,.1,.5),n.audio.tone(90,.3,`square`,.13,-40),e.kick=1}function wf(e,t,n,r){let i=e.game,a=Math.random()*of,o=0;for(let[s,c]of r){for(let r=0;r<s;r++){let l=a+r/s*of+o*.4,u=t+Math.cos(l)*c,d=n+Math.sin(l)*c;if(!i.world.playable(u,d))continue;let f=i.world.heightAt(u,d),p=.7+o*.1+r*.03,m=i.fx.telegraph(u,f,d,0,`circle`,1.5,0,sf,p);e.strikes.push({kind:`spike`,x:u,z:d,gy:f,t:0,dur:p,slot:m,r:1.5})}o++}}function Tf(e,t,n){if(!e.strikes.length)return;let r=e.game;for(let i=e.strikes.length-1;i>=0;i--){let a=e.strikes[i];if(a.t+=t,a.kind===`boulder`?Math.random()<t*14&&r.fx.emit(a.x+(Math.random()-.5)*a.r,a.gy+.2,a.z+(Math.random()-.5)*a.r,0,1.2,0,cf[Math.floor(Math.random()*4)],.1,.5,-.5):Math.random()<t*24&&r.fx.emit(a.x+(Math.random()-.5)*1.4,a.gy+.1,a.z+(Math.random()-.5)*1.4,0,1.6+Math.random(),0,cf[Math.floor(Math.random()*4)],.08,.4,0),!(a.t<a.dur)){if(e.strikes.splice(i,1),a.kind===`boulder`)sc(r,a.x,a.gy+.7,a.z,2.4),r.fx.shockwave(a.x,a.gy,a.z,13496063,2.4),r.fx.ring(a.x,a.gy+.2,a.z,8376575,18,5,.1,.5),r.fx.burst(a.x,a.gy+.5,a.z,cf,16,4.4,.12,.7),r.shake(.18),r.audio.tone(110,.25,`square`,.1,-50);else{r.fx.shockwave(a.x,a.gy,a.z,13496063,1.6),r.fx.burst(a.x,a.gy+.4,a.z,cf,14,3.2,.12,.7,5,6.5);for(let e=0;e<7;e++){let t=Math.random()*of,n=Math.random()*.8;r.fx.emit(a.x+Math.cos(t)*n,a.gy+.3,a.z+Math.sin(t)*n,Math.cos(t)*.6,5+Math.random()*4,Math.sin(t)*.6,cf[e%4],.2,.5,14)}r.vfx.glow(a.x,a.gy+.9,a.z,sf,3,.3,{grow:.7,gain:.8}),r.shake(.1),r.audio.tone(320,.14,`triangle`,.08,-160)}if(!n.dead&&Math.hypot(n.pos.x-a.x,n.pos.z-a.z)<a.r+.2&&n.pos.y<a.gy+1.6){let t=a.kind===`boulder`?e.def.dmg+1:e.def.dmg;n.hurt(t,a.x,a.z,a.kind===`boulder`?8:6)&&(r.fx.burst(n.pos.x,n.pos.y+1,n.pos.z,cf,8,3,.09,.35),n.chill?.(a.kind===`boulder`?2.4:1.8))}}}}function Ef(e){return[e.x+Math.sin(e.yaw)*1.5,e.y+3.1,e.z+Math.cos(e.yaw)*1.5]}function Df(e,t,n){let r=e.game;e.fireAcc=(e.fireAcc||0)+t;let[i,a,o]=Ef(e),s=Math.hypot(n.pos.x-e.x,n.pos.z-e.z),c=mf(e)>1?3:2;for(;e.fireAcc>=.085;){e.fireAcc-=.085;for(let t=0;t<c;t++){let t=(Math.random()-.5)*.62,c=11+Math.random()*3,l=z((n.pos.y+1-a)/Math.max(.5,s/c),-7,1.5)+(Math.random()-.5)*1.5;r.spawnProjectile({owner:`enemy`,kind:`icebreath`,x:i,y:a,z:o,vx:Math.sin(e.yaw+t)*c,vz:Math.cos(e.yaw+t)*c,vy:l,dmg:Math.max(2,e.def.dmg-1),life:.62,r:.8})}}for(let t=0;t<6;t++){let t=(Math.random()-.5)*.7,n=5+Math.random()*7;r.fx.emit(i,a,o,Math.sin(e.yaw+t)*n,-1.5+Math.random()*1.4,Math.cos(e.yaw+t)*n,cf[Math.floor(Math.random()*4)],.12+Math.random()*.1,.5,.5)}r.vfx.glowNow(i,a,o,11461887,1.2+Math.random()*.4,.8)}function Of(e,t,n){let{g:r,P:i,dx:a,dz:o,dist:s,sees:c,toP:l}=n,u=mf(e),d=e.def.speed*u,f=0,p=0,m=Math.hypot(e.x-e.home.x,e.z-e.home.z)>38;Tf(e,t,i);let h=e.state,g=(t=`recover`)=>{e.state=t,e.t=0};if(h===`idle`||h===`wander`){if(c&&!m)e.state=`roar`,e.t=0,e.roarBlast=!1,e.cd=.5;else{if(e.wanderT-=t,e.wanderT<=0){e.wanderT=2.5+Math.random()*3;let t=Math.random()*of,n=Math.random()*9;e.target={x:e.home.x+Math.cos(t)*n,z:e.home.z+Math.sin(t)*n}}let n=e.target.x-e.x,r=e.target.z-e.z,i=Math.hypot(n,r);i>.8&&(f=n/i*(m?2.2:1.1),p=r/i*(m?2.2:1.1),_f(e,Math.atan2(n,r),2.2,t))}}else if(h===`chase`){if((!c&&s>e.def.aggro*1.5||m)&&(e.state=`idle`,e.target={x:e.home.x,z:e.home.z},e.wanderT=4),_f(e,l,5*u,t),s>2.6&&(f=a/s*d,p=o/s*d),e.cd<=0&&c){let t=Sf(e,s,u);t?xf(e,t,i,s):e.cd=.35}}else if(h===`rakewind`)_f(e,l,6.5*u,t),e.t>hf(e,h)&&(e.clearWarn(),e.state=`rake1`,e.t=0,e.hitDone=!1,vf(e,11),e.kick=1,r.audio.tone(70,.18,`square`,.12,-20));else if(h===`rake1`)!e.hitDone&&e.t>.07&&(e.hitDone=!0,bf(e,-.75),yf(e,i,e.def.dmg,e.radius+2.5,1.05,7),r.shake(.12)),e.t>hf(e,h)&&(e.state=`rake2`,e.t=0,e.hitDone=!1,_f(e,l,2,1),vf(e,9));else if(h===`rake2`)_f(e,l,4,t),!e.hitDone&&e.t>.15&&(e.hitDone=!0,bf(e,.75,{sweep:-2.5}),yf(e,i,e.def.dmg,e.radius+2.5,1.05,8),r.shake(.14),r.audio.tone(70,.16,`square`,.12,-20)),e.t>hf(e,h)&&(u>1&&s<6.5?(e.state=`rake3`,e.t=0,e.hitDone=!1,_f(e,l,2,1),e.warn(`circle`,2.7,0,.5),e.teleKind=`dive`,r.audio.tone(60,.4,`sawtooth`,.1,-20)):g());else if(h===`rake3`){if(e.t<.4&&_f(e,l,3,t),e.teleSlot&&e.teleKind===`dive`){let t=e.x+Math.sin(e.yaw)*2.6,n=e.z+Math.cos(e.yaw)*2.6;e.teleSlot.mesh.position.set(t,r.world.heightAt(t,n)+.1,n)}if(!e.hitDone&&e.t>.42){e.hitDone=!0,e.clearWarn(),vf(e,8);let t=e.x+Math.sin(e.yaw)*2.6,n=e.z+Math.cos(e.yaw)*2.6,a=r.world.heightAt(t,n);bf(e,Math.PI/2,{radius:3.4,thick:1.8,sweep:2.8}),r.fx.shockwave(t,a,n,13496063,3.2),r.fx.ring(t,a+.2,n,sf,20,5.5,.11,.5),r.fx.burst(t,a+.5,n,cf,18,4.6,.13,.8,8,4),r.vfx.glow(t,a+.8,n,sf,4,.3,{grow:.7}),r.shake(.4),r.punch(.2),r.audio.tone(55,.35,`square`,.16,-25),yf(e,i,e.def.dmg+2,2.8,Math.PI,10,t,n)}e.t>hf(e,h)&&g()}else if(h===`breathwind`)_f(e,l,4.5,t),e.t>hf(e,h)&&(e.clearWarn(),e.state=`breath`,e.t=0,e.fireAcc=.085,r.audio.tone(160,1.2,`sawtooth`,.08,90));else if(h===`breath`)_f(e,l,1.15*u,t),Df(e,t,i),s>4&&(f=a/s*d*.28,p=o/s*d*.28),e.t>hf(e,h)&&g();else if(h===`slamwind`){if(_f(e,Math.atan2(e.dive.x-e.x,e.dive.z-e.z),6,t),e.t>hf(e,h)){let t=Math.hypot(e.dive.x-e.x,e.dive.z-e.z);e.state=`leap`,e.t=0,e.leapT=z(t/11,.55,.9),e.leapFrom={x:e.x,z:e.z},e.vy=11*e.leapT,e.air=!0,r.fx.dust(e.x,e.y,e.z,8,1.8,15266554),r.fx.ring(e.x,e.y+.2,e.z,sf,14,4,.1,.4),r.audio.tone(130,.5,`sawtooth`,.12,200),r.shake(.12)}}else if(h===`leap`){let n=z(e.t/e.leapT,0,1),a=e.leapFrom.x+(e.dive.x-e.leapFrom.x)*n,o=e.leapFrom.z+(e.dive.z-e.leapFrom.z)*n;e.moveBy(a-e.x,o-e.z),_f(e,Math.atan2(e.dive.x-e.x,e.dive.z-e.z),8,t),Math.random()<t*40&&r.fx.emit(e.x+(Math.random()-.5),e.y+.6,e.z+(Math.random()-.5),0,-.4,0,cf[Math.floor(Math.random()*4)],.12,.5,0),(e.t>.2&&!e.air||e.t>e.leapT+.2)&&(e.clearWarn(),e.air=!1,e.vy=0,e.y=Math.max(r.world.heightAt(e.x,e.z),e.y-0),e.state=`land`,e.t=0,r.fx.shockwave(e.x,e.y,e.z,13496063,4.2),r.fx.ring(e.x,e.y+.25,e.z,sf,28,7,.12,.6),r.fx.burst(e.x,e.y+.5,e.z,cf,22,5.5,.14,.9,8,4),r.vfx.glow(e.x,e.y+.8,e.z,sf,5.5,.35,{grow:.8}),r.shake(.55),r.punch(.35),r.audio.tone(50,.5,`square`,.18,-20),yf(e,i,e.def.dmg+2,4,Math.PI,11),wf(e,e.x,e.z,u>1?[[6,4.8],[9,7.6]]:[[6,5.2]]))}else if(h===`land`)e.t>hf(e,h)&&(u>1&&s<5.5?(e.cd=0,g(`chase`)):g());else if(h===`hurlwind`){_f(e,l,5,t);let n=z(e.t/hf(e,h),0,1),a=e.x+Math.sin(e.yaw)*.5,o=e.z+Math.cos(e.yaw)*.5;if(r.vfx.glowNow(a,e.y+4.5,o,11461887,.6+n*1.9,.9),Math.random()<t*50*(.3+n)){let t=Math.random()*of;r.fx.emit(a+Math.cos(t)*1.6,e.y+4.5+Math.sin(t)*1.2,o+Math.sin(t)*.6,-Math.cos(t)*2.6,-Math.sin(t)*2.2,0,cf[Math.floor(Math.random()*4)],.1,.5,0)}e.t>hf(e,h)&&(e.state=`hurl`,e.t=0,Cf(e,i))}else if(h===`hurl`)_f(e,l,4,t),e.t>hf(e,h)&&g();else if(h===`roar`){let n=hf(e,h);if(_f(e,l,3,t),!e.roarBlast&&e.t>.25&&(e.roarBlast=!0,r.fx.ring(e.x,e.y+1.4,e.z,sf,24,6,.12,.6),r.fx.shockwave(e.x,e.y,e.z,13496063,3.6),r.vfx.glow(e.x,e.y+3.2,e.z,12577535,4,.4,{grow:.8}),r.shake(.4),r.audio.tone(70,.9,`sawtooth`,.2,-25),e.enraged&&!i.dead&&s<6&&i.hurt(Math.max(2,e.def.dmg-2),e.x,e.z,10)&&i.chill?.(2)),Math.random()<t*40){let[t,n,i]=Ef(e);r.fx.emit(t,n,i,Math.sin(e.yaw)*4+(Math.random()-.5)*3,Math.random()*1.5,Math.cos(e.yaw)*4+(Math.random()-.5)*3,cf[Math.floor(Math.random()*4)],.12,.6,.5)}e.t>n&&(e.state=`chase`,e.cd=.15,e.t=0)}else h===`recover`&&e.t>hf(e,h)&&(e.state=`chase`,e.t=0,e.cd=(.65+Math.random()*.8)/u);return[f,p]}function kf(e,t,n){let{spd:r,t:i,hk:a,spawnS:o}=n,s=e.game,c=e.model.parts,l=e.state,u=e.puppet?.6:Math.min(1,r/2.6);e.gaitC=(e.gaitC||0)+t*(2.6+r*1.5);let d=e.gaitC,f=Math.floor(d/Math.PI);f!==e.stepIdx&&(e.stepIdx=f,u>.5&&n.dist<14&&(s.fx.dust(e.x+(f%2?.5:-.5),e.y,e.z,3,1.2,15266554),n.dist<11&&s.shake(.05)));let p=Math.sin(d)*u,m=Math.sin(d+Math.PI)*u,h=hf(e,l),g=Af(lf.has(l)?z(e.t/h,0,1):0),_={thL:p*.5,thR:m*.5,knL:Math.max(0,p)*.95,knR:Math.max(0,m)*.95,thZ:.06,aLx:.12-m*.34+Math.sin(i*1.6)*.03,aRx:.12-p*.34+Math.sin(i*1.6+1)*.03,aLz:-.2,aRz:.2,eL:-.38-Math.max(0,m)*.2,eR:-.38-Math.max(0,p)*.2,bx:.2+u*.05+Math.sin(i*1.8)*.02,by:0,bz:p*.05,hx:.1+Math.sin(i*1.5)*.03,jaw:.14+Math.max(0,Math.sin(i*1.1+e.phase))*.1,chest:1+Math.sin(i*2.3)*.014,rootY:Math.abs(Math.sin(d))*.05*u,rootX:0},v=14;if(l===`rakewind`)_.aRx=-.25-g*2.15,_.aRz=.2+g*.4,_.eR=-.5-g*.5,_.aLx=-.2-g*.4,_.aLz=-.2-g*.3,_.eL=-.6,_.by=-.5*g,_.bx=.1-g*.12,_.hx=-.2*g,_.jaw=.35+.35*g,_.thL=-.1*g,_.thR=.14*g,_.knL=.2*g,_.knR=.1*g,v=18;else if(l===`rake1`){let t=Af(z(e.t/.15,0,1));_.aRx=-2.4+t*2.5,_.aRz=.6-t*1.1,_.eR=-.9+t*.7,_.aLx=-.5,_.aLz=-.5,_.eL=-.7,_.by=-.5+t*1,_.bx=.22+t*.28,_.hx=.12+t*.2,_.jaw=.95,_.thL=-.3*t,_.thR=.1,_.knL=.4*t,_.rootY=-.1*t,v=34}else if(l===`rake2`){let t=Af(z(e.t/.12,0,1)),n=Af(z((e.t-.1)/.14,0,1));_.aLx=-.5-t*1.8+n*2.35,_.aLz=-.5-t*.3+n*1.2,_.eL=-.7-t*.2+n*.7,_.aRx=.1,_.aRz=.5,_.eR=-.5,_.by=.5-t*.2-n*1,_.bx=.45,_.hx=.15+n*.15,_.jaw=.95,_.thR=-.3*n,_.knR=.4*n,_.rootY=-.08*n,v=34}else if(l===`rake3`){let t=Af(z(e.t/.38,0,1)),n=Af(z((e.t-.4)/.12,0,1)),r=-3*t+n*3.5;_.aLx=r,_.aRx=r,_.aLz=-.3-t*.2,_.aRz=.3+t*.2,_.eL=-.3+n*.15,_.eR=-.3+n*.15,_.bx=-.2*t+n*.75,_.by=0,_.hx=-.3*t+n*.5,_.jaw=.6+.4*n,_.thL=-.5*n,_.thR=-.5*n,_.knL=.8*n,_.knR=.8*n,_.rootY=-.3*n,v=e.t>.38?40:14}else if(l===`breathwind`)_.hx=-.6*g,_.jaw=.25+.75*g,_.bx=.1-.3*g,_.chest=1+.1*g,_.aLx=-.3*g,_.aRx=-.3*g,_.aLz=-.25-.55*g,_.aRz=.25+.55*g,_.eL=-.5,_.eR=-.5,_.thZ=.06+.14*g,_.thL=-.1*g,_.thR=-.1*g,_.knL=.25*g,_.knR=.25*g,_.rootY=-.08*g,Math.random()<t*30*g&&s.fx.emit(e.x+Math.sin(e.yaw)*1.5,e.y+3.1,e.z+Math.cos(e.yaw)*1.5,Math.sin(e.yaw)*-1.5,.3,Math.cos(e.yaw)*-1.5,13496063,.1,.4,0);else if(l===`breath`)_.hx=.18+Math.sin(e.t*30)*.03,_.jaw=1,_.bx=.12,_.chest=1.08,_.aLx=-.4,_.aRx=-.4,_.aLz=-.75,_.aRz=.75,_.eL=-.5,_.eR=-.5,_.thZ=.2,_.thL=-.12,_.thR=-.12,_.knL=.3,_.knR=.3,_.rootY=-.1,_.bz=Math.sin(e.t*38)*.025,v=18;else if(l===`slamwind`)_.thL=-.9*g,_.thR=-.9*g,_.knL=1.5*g,_.knR=1.5*g,_.rootY=-.4*g,_.thZ=.14*g,_.bx=.2+.4*g,_.hx=-.1+.1*g,_.jaw=.5+.4*g,_.aLx=.2+.9*g,_.aRx=.2+.9*g,_.aLz=-.5*g,_.aRz=.5*g,_.eL=-.3,_.eR=-.3,_.chest=1+.05*g;else if(l===`leap`)_.thL=-.7,_.thR=-.4,_.knL=1,_.knR=1.3,_.rootY=0,_.aLx=-2.7,_.aRx=-2.7,_.aLz=-.55,_.aRz=.55,_.eL=-.3,_.eR=-.3,_.bx=.45,_.hx=.2,_.jaw=1,v=16;else if(l===`land`){let t=1-z(e.t/h,0,1),n=t*t;_.thL=-.9*n,_.thR=-.9*n,_.knL=1.5*n,_.knR=1.5*n,_.rootY=-.4*n,_.thZ=.12*n,_.bx=.2+.3*n,_.aLx=-.1+.2*(1-n),_.aRx=_.aLx,_.aLz=-.35,_.aRz=.35,_.eL=-.2,_.eR=-.2,_.jaw=.5,v=26}else if(l===`hurlwind`)_.aLx=-2.95*g,_.aRx=-2.95*g,_.aLz=-.3*g,_.aRz=.3*g,_.eL=-.2,_.eR=-.2,_.bx=.1-.4*g,_.hx=-.4*g,_.jaw=.4+.3*g,_.chest=1+.06*g,_.thL=-.1*g,_.thR=.2*g,_.knL=.2*g,_.knR=.3*g,_.thZ=.1+.08*g,_.bz=Math.sin(i*40)*.015*g;else if(l===`hurl`){let t=Af(z(e.t/.14,0,1)),n=z((e.t-.15)/.3,0,1);_.aLx=-2.95+t*2.7+n*.4,_.aRx=-2.95+t*3.3+n*.4,_.aLz=-.3,_.aRz=.3,_.eL=-.2-t*.4,_.eR=-.2-t*.4,_.bx=-.3+t*.85,_.hx=-.4+t*.8,_.jaw=.8*(1-n)+.2,_.thL=-.5*t,_.thR=.3*t,_.knL=.6*t,_.knR=.2*t,_.rootY=-.12*t,v=36}else if(l===`roar`){let t=Af(z(e.t/.3,0,1)),n=Math.sin(e.t*55)*.02*t;_.hx=-.75*t,_.jaw=1.05*t,_.bx=.05-.28*t,_.chest=1+.12*t,_.aLx=-1*t,_.aRx=-1*t,_.aLz=-.35-.9*t,_.aRz=.35+.9*t,_.eL=-.9*t,_.eR=-.9*t,_.bz=n,_.thZ=.06+.1*t,_.rootY=-.06*t,v=16}else l===`recover`?(_.bx=.34+Math.sin(e.t*10)*.04,_.hx=.28,_.jaw=.35+Math.max(0,Math.sin(e.t*10))*.2,_.aLx=.25,_.aRx=.25,_.aLz=-.3,_.aRz=.3,_.eL=-.25,_.eR=-.25,_.thL=-.15,_.thR=-.15,_.knL=.35,_.knR=.35,_.rootY=-.1,_.chest=1+Math.sin(e.t*10)*.035):l===`idle`||l===`wander`?(_.bx=.22+Math.sin(i*1.4)*.025,_.hx=.12+Math.sin(i*.9)*.05,_.chest=1+Math.sin(i*1.4)*.025,_.aLx=.1+Math.sin(i*1.4)*.04,_.aRx=.1+Math.sin(i*1.4+.6)*.04,l===`idle`&&Math.random()<t*1.1&&s.fx.emit(e.x+Math.sin(e.yaw)*1.5,e.y+3.1,e.z+Math.cos(e.yaw)*1.5,Math.sin(e.yaw)*1.2,.5,Math.cos(e.yaw)*1.2,15135999,.18,.9,-.3)):l===`chase`&&(_.bx=.3+u*.08,_.hx=.18,_.jaw=.3+Math.max(0,Math.sin(i*3))*.16,_.aLx=.06-m*.5,_.aRx=.06-p*.5,_.aLz=-.3,_.aRz=.3,_.eL=-.5-Math.max(0,m)*.3,_.eR=-.5-Math.max(0,p)*.3,_.thL=p*.7,_.thR=m*.7,_.knL=Math.max(0,p)*1.2,_.knR=Math.max(0,m)*1.2,_.rootY=Math.abs(Math.sin(d))*.075*u,_.bz=p*.07,Math.random()<t*3&&s.fx.emit(e.x+Math.sin(e.yaw)*1.5,e.y+3,e.z+Math.cos(e.yaw)*1.5,Math.sin(e.yaw)*1.5,.4,Math.cos(e.yaw)*1.5,15135999,.14,.6,-.3));let y=Math.min(1,t*v),b=(e,t,n,r=y)=>{e.rotation[t]+=(n-e.rotation[t])*r};if(b(c.legL,`x`,_.thL),b(c.legR,`x`,_.thR),b(c.legL,`z`,-_.thZ),b(c.legR,`z`,_.thZ),b(c.kneeL,`x`,_.knL),b(c.kneeR,`x`,_.knR),b(c.armL,`x`,_.aLx),b(c.armR,`x`,_.aRx),b(c.armL,`z`,_.aLz),b(c.armR,`z`,_.aRz),b(c.elbowL,`x`,_.eL),b(c.elbowR,`x`,_.eR),b(c.body,`x`,_.bx),b(c.body,`y`,_.by),c.body.rotation.z=_.bz,b(c.head,`x`,_.hx),c.head.rotation.y+=(n.lookSm*.7-c.head.rotation.y)*Math.min(1,t*8),b(c.jaw,`x`,_.jaw,Math.min(1,t*20)),c.body.scale.setScalar(_.chest),c.cloth.rotation.x=p*.1+Math.sin(i*2)*.03+(_.thL+_.thR)*.25,e.obj.scale.setScalar(o*e.baseScale),l===`hurlwind`||l===`breathwind`){let t=.22+g*.3+Math.sin(i*30)*.08;e.model.mat.emissive.setRGB(t*.2,t*.55,t)}return{rootY:_.rootY,rootX:_.rootX}}function Af(e){return e*e*(3-2*e)}var jf={S:.03,orange:14251036,orangeHi:15370794,orangeLo:12081175,black:1183244,white:16117730,whiteLo:14275008,pink:9842493,pinkHi:12736106,nose:11557476,eye:16762906,eyeHi:16773258,tooth:15919830,claw:2367516},Mf={S:.025,olive:5662010,oliveHi:7241284,oliveLo:3885096,tan:9599820,tanHi:11441505,tanLo:7693114,belly:11902314,grey:7303542,greyHi:10132641,greyLo:4671822,brown:5915696,scar:7084572,scarDeep:4460559,pink:11553378,pinkHi:13856130,tooth:15655620,toothLo:13220760,claw:3816256,clawTip:9211540,eye:16098060,eyeHi:16766042,dark:1447439},Nf=(e,t,n=0)=>vt(e,t,n),Pf=1<<24,Ff=1<<25,If=class{constructor(e,t,n,r,i,a,o=1){this.k=o,this.x0=Math.floor(e*o),this.y0=Math.floor(t*o),this.z0=Math.floor(n*o),this.sx=Math.ceil(r*o)-this.x0,this.sy=Math.ceil(i*o)-this.y0,this.sz=Math.ceil(a*o)-this.z0,this.data=new Int32Array(this.sx*this.sy*this.sz),this.owner=new Uint8Array(this.sx*this.sy*this.sz),this.ids=[`_`],this.cur=0,this.xf=null}scaled(e,t,n){let r=this.xf;this.xf={s:e,c:t},n(),this.xf=r}T(e){let t=this.xf;return t?[t.c[0]+(e[0]-t.c[0])*t.s,t.c[1]+(e[1]-t.c[1])*t.s,t.c[2]+(e[2]-t.c[2])*t.s]:e}R(e){let t=this.xf;return t?e*t.s:e}idx(e,t,n){return e-this.x0+this.sx*(t-this.y0+this.sy*(n-this.z0))}inside(e,t,n){let r=e-this.x0,i=t-this.y0,a=n-this.z0;return r>=0&&i>=0&&a>=0&&r<this.sx&&i<this.sy&&a<this.sz}own(e){let t=this.ids.indexOf(e);return t<0&&(this.ids.push(e),t=this.ids.length-1),this.cur=t,this}has(e,t,n){return this.inside(e,t,n)&&this.data[this.idx(e,t,n)]!==0}color(e,t,n){return this.inside(e,t,n)?this.data[this.idx(e,t,n)]&16777215:0}setG(e,t,n,r,i=!1){if(!this.inside(e,t,n))return;let a=this.idx(e,t,n);this.data[a]=r&16777215|Pf|(i?Ff:0),this.owner[a]=this.cur}tintG(e,t,n,r,i){if(!this.inside(e,t,n))return;let a=this.idx(e,t,n);this.data[a]&&(this.data[a]=r&16777215|Pf|(i===void 0?this.data[a]&Ff:i?Ff:0))}exposed(e,t,n){return!this.has(e+1,t,n)||!this.has(e-1,t,n)||!this.has(e,t+1,n)||!this.has(e,t-1,n)||!this.has(e,t,n+1)||!this.has(e,t,n-1)}set(e,t,n,r,i=!1){let a=this.k;this.setG(Math.floor(e*a),Math.floor(t*a),Math.floor(n*a),r,i)}clearG(e,t,n){this.inside(e,t,n)&&(this.data[this.idx(e,t,n)]=0)}putG(e,t,n,r,i=0,a=0,o=!1){let s=this.k,c=(e+.5)/s,l=(t+.5)/s,u=(n+.5)/s,d=this.xf;d&&(c=d.c[0]+(c-d.c[0])/d.s,l=d.c[1]+(l-d.c[1])/d.s,u=d.c[2]+(u-d.c[2])/d.s);let f=typeof r==`function`?r(c,l,u,i,a):r;f!=null&&this.setG(e,t,n,f,o)}ell(e,t,n,r=!1){let i=this.k,[a,o,s]=this.T(e).map(e=>e*i),[c,l,u]=(typeof t==`number`?[t,t,t]:t).map(e=>this.R(e)*i);for(let e=Math.floor(s-u);e<=Math.ceil(s+u);e++)for(let t=Math.floor(o-l);t<=Math.ceil(o+l);t++)for(let i=Math.floor(a-c);i<=Math.ceil(a+c);i++){let d=(i+.5-a)/c,f=(t+.5-o)/l,p=(e+.5-s)/u,m=d*d+f*f+p*p;m<=1&&this.putG(i,t,e,n,0,Math.sqrt(m),r)}}cap(e,t,n,r,i,a=[1,1,1],o=!1){let s=this.k;e=this.T(e).map(e=>e*s),t=this.T(t).map(e=>e*s),n=this.R(n)*s,r=this.R(r)*s;let c=[t[0]-e[0],t[1]-e[1],t[2]-e[2]],l=c[0]*c[0]+c[1]*c[1]+c[2]*c[2]||1,u=Math.max(n,r)*Math.max(a[0],a[1],a[2])+1,d=[0,1,2].map(n=>Math.floor(Math.min(e[n],t[n])-u)),f=[0,1,2].map(n=>Math.ceil(Math.max(e[n],t[n])+u));for(let t=d[2];t<=f[2];t++)for(let s=d[1];s<=f[1];s++)for(let u=d[0];u<=f[0];u++){let d=u+.5-e[0],f=s+.5-e[1],p=t+.5-e[2],m=z((d*c[0]+f*c[1]+p*c[2])/l,0,1),h=(d-c[0]*m)/a[0],g=(f-c[1]*m)/a[1],_=(p-c[2]*m)/a[2],v=n+(r-n)*m,y=Math.sqrt(h*h+g*g+_*_);y<=v&&this.putG(u,s,t,i,m,y/v,o)}}line(e,t,n,r=!1){let i=this.k;e=this.T(e),t=this.T(t);let a=Math.ceil(Math.max(Math.abs(t[0]-e[0]),Math.abs(t[1]-e[1]),Math.abs(t[2]-e[2]))*i*1.5)+1;for(let o=0;o<=a;o++){let s=o/a;this.setG(Math.floor((e[0]+(t[0]-e[0])*s)*i),Math.floor((e[1]+(t[1]-e[1])*s)*i),Math.floor((e[2]+(t[2]-e[2])*s)*i),typeof n==`function`?n(s):n,r)}}box(e,t,n,r,i,a,o,s=!1){let c=this.k;for(let l=Math.floor(n*c);l<Math.ceil(a*c);l++)for(let n=Math.floor(t*c);n<Math.ceil(i*c);n++)for(let t=Math.floor(e*c);t<Math.ceil(r*c);t++)this.putG(t,n,l,o,0,0,s)}reown(e,t,n){let r=this.ids.indexOf(e);if(r<0)return;let i=this.ids.indexOf(t);i<0&&(this.ids.push(t),i=this.ids.length-1);let a=this.k;for(let e=this.z0;e<this.z0+this.sz;e++)for(let t=this.y0;t<this.y0+this.sy;t++)for(let o=this.x0;o<this.x0+this.sx;o++){let s=this.idx(o,t,e);this.data[s]&&this.owner[s]===r&&n((o+.5)/a,(t+.5)/a,(e+.5)/a)&&(this.owner[s]=i)}}stamp(e,t,n,r=!0,i){let a=this.k,[o,s,c]=this.T(e).map(e=>e*a),[l,u,d]=(typeof t==`number`?[t,t,t]:t).map(e=>this.R(e)*a);for(let e=Math.floor(c-d);e<=Math.ceil(c+d);e++)for(let t=Math.floor(s-u);t<=Math.ceil(s+u);t++)for(let f=Math.floor(o-l);f<=Math.ceil(o+l);f++){if(!this.has(f,t,e)||r&&!this.exposed(f,t,e))continue;let p=(f+.5-o)/l,m=(t+.5-s)/u,h=(e+.5-c)/d,g=p*p+m*m+h*h;if(g>1)continue;let _=(f+.5)/a,v=(t+.5)/a,y=(e+.5)/a,b=this.xf;b&&(_=b.c[0]+(_-b.c[0])/b.s,v=b.c[1]+(v-b.c[1])/b.s,y=b.c[2]+(y-b.c[2])/b.s);let x=typeof n==`function`?n(_,v,y,Math.sqrt(g),this.color(f,t,e)):n;x!=null&&this.tintG(f,t,e,x,i)}}paint(e){let t=this.k,n=[];for(let r=this.z0;r<this.z0+this.sz;r++)for(let i=this.y0;i<this.y0+this.sy;i++)for(let a=this.x0;a<this.x0+this.sx;a++){let o=this.idx(a,i,r);if(!this.data[o])continue;let s=e((a+.5)/t,(i+.5)/t,(r+.5)/t,this.data[o]&16777215,this.ids[this.owner[o]],a,i,r);s!=null&&n.push(a,i,r,s)}for(let e=0;e<n.length;e+=4)this.tintG(n[e],n[e+1],n[e+2],n[e+3])}extract(e,t,n,r=1){let i=this.ids.indexOf(e);if(i<0)return null;let a=1e9,o=1e9,s=1e9,c=-1e9,l=-1e9,u=-1e9,d=[];for(let e=this.z0;e<this.z0+this.sz;e++)for(let t=this.y0;t<this.y0+this.sy;t++)for(let n=this.x0;n<this.x0+this.sx;n++){let r=this.idx(n,t,e);this.data[r]&&this.owner[r]===i&&(d.push(n,t,e),a=Math.min(a,n),o=Math.min(o,t),s=Math.min(s,e),c=Math.max(c,n),l=Math.max(l,t),u=Math.max(u,e))}if(!d.length)return null;let f=r+1;a-=f,o-=f,s-=f;let p=new W(c-a+1+f,l-o+1+f,u-s+1+f),m=(e,t,n)=>{let r=this.data[this.idx(e,t,n)];r&&p.set(e-a,t-o,n-s,r&16777215,!!(r&Ff))};for(let e=0;e<d.length;e+=3)m(d[e],d[e+1],d[e+2]);if(r>0)for(let e=0;e<d.length;e+=3)for(let t=-r;t<=r;t++)for(let n=-r;n<=r;n++)for(let i=-r;i<=r;i++){let r=d[e]+i,c=d[e+1]+n,l=d[e+2]+t;this.inside(r,c,l)&&!p.has(r-a,c-o,l-s)&&m(r,c,l)}let h=this.k;return{geo:p.build(n/h,t[0]*h-a,t[1]*h-o,t[2]*h-s),voxels:d.length/3}}};function Lf(e,t,n){let r={},i=0;for(let a of t){let t=e.extract(a.id,a.pivot,n);if(r[a.id]=t?t.geo:null,t)for(let e of[`solid`,`glow`])t.geo[e]&&(i+=t.geo[e].index.count/3)}return{spec:t,geos:r,size:n,tris:i}}var Rf=new a({vertexColors:!0});function zf(e,t){let n=new V,r={},i={};for(let a of e.spec){let o=new V,s=a.parent?i[a.parent]:[0,0,0];o.position.set((a.pivot[0]-s[0])*e.size,(a.pivot[1]-s[1])*e.size,(a.pivot[2]-s[2])*e.size),i[a.id]=a.pivot,r[a.id]=o,(a.parent?r[a.parent]:n).add(o);let c=e.geos[a.id];if(c)for(let e of[`solid`,`glow`]){if(!c[e])continue;let n=new yt(c[e],e===`solid`?t:Rf);n.userData.sharedGeo=!0,n.castShadow=e===`solid`,o.add(n)}}return{root:n,groups:r}}var Bf=.88,Vf=1.08,Hf=[0,35,33],Uf=(e,t,n,r=0)=>l(Math.floor(e*Bf),Math.floor(t*Bf),Math.floor(n*Bf),r),Wf=(e,t,n,r=0)=>l(Math.floor(e*.5),Math.floor(t*.5),Math.floor(n*.5),r),Gf=(e,t,n,r=.5)=>U(v(jf.orangeLo,jf.orangeHi,z(r*.8+Wf(e,t,n,3)*.3,0,1)),.05,Uf(e,t,n,4)),Kf=(e,t,n,r=0)=>U(r>.5?jf.whiteLo:jf.white,.04,Uf(e,t,n,5)),qf=(e,t,n)=>U(jf.black,.25,Uf(e,t,n,6));function Jf(e,t,n,r,i,a=4.1,o=2.7,s=11){let c=e>=0?1:2,u=n+(Nf(n*.09+c*13,t*.12,s)-.5)*12+(r-t)*.32,d=Math.floor(u/a),f=u-d*a-a/2,p=z((t-i)/Math.max(1,r-i),0,1),m=o*p**.5+.5+(l(d,c,0,s)-.5)*.8;if(!(l(d+c*17,Math.floor(t/6),1,s)<.1&&t<r-3)&&Math.abs(f)<m*.5)return!0;if(l(d,c,2,s)<.7&&t>r-12){let e=u-(d+.5)*a;if(Math.abs(e)<1.3*p+.2)return!0}return!1}function Yf(e,t,n){let r=Nf(e*.1+n*.14,t*.16,7),i=25+(Nf(n*.18,2,9)-.5)*3.4+z((n-14)*.5,0,8)+(Math.abs(e)<3?2:0);return t<i?Kf(e,t,n,+(t<i-4)):t<i+1.4&&Uf(e,t,n,8)<.5?Kf(e,t,n,0):Jf(e,t,n,51,i)?qf(e,t,n):Gf(e,t,n,r)}function Xf(e,t,n,r,i,a,o){let s=r*e<i-3.4;if(t<o||s&&Uf(e,t,n,12)<.92)return Kf(e,t,n,+!s);if(!s&&t>20&&Jf(e,t,n,49,16,3.9,2.7,14))return qf(e,t,n);let c=(t+Nf(n*.2,e*.2,5)*4+20)%5.6;return t<a&&c<1.7&&Uf(e,t,n,13)<.9?qf(e,t,n):Gf(e,t,n,Nf(e*.2,t*.2,4))}function Zf(e,t,n){let r=Math.abs(e),i=Nf(e*.2,n*.2,14);if(n>47&&t<35.4)return Uf(e,t,n,9)<.2&&t>33.5&&r>2?qf(e,t,n):Kf(e,t,n,0);if(t<34.4&&n>38)return Kf(e,t,n,0);if(r>6.6&&t<37.2){let i=(t+r*.7+20)%4.4;return i<1.3&&Uf(e,t,n,15)<.92?qf(e,t,n):Kf(e,t,n,+(i>3.2))}return n>44&&t>36&&t<43&&r<4.2?(n+r*.6)%4.2<1.2&&Uf(e,t,n,10)<.9||n>49&&Uf(e,t,n,19)<.2?qf(e,t,n):Gf(e,t,n,.6):t>42.5&&n<46&&r<6.8&&(r%2.9<1.1||r<1.5&&n<41)?qf(e,t,n):n>41&&n<46&&t>41.5&&r>3.6&&r<7&&Uf(e,t,n,16)<.5?Kf(e,t,n,0):Gf(e,t,n,.35+i*.5)}function Qf(e,t,n,r){return n<r||(-n+8)%6.2<2.2&&Uf(e,t,n,17)<.95?qf(e,t,n):t<28&&Uf(e,t,n,18)<.3?Kf(e,t,n,1):Gf(e,t,n,.5)}var $f=(e,t,n,r)=>(i,a,o,s,c)=>c>n&&Uf(i,a,o,r)<t?null:e(i,a,o);function ep(){let e=new If(-30,0,-80,30,62,64,Bf);e.own(`chest`),e.ell([0,34.5,12],[11.4,12.6,14],$f(Yf,.4,.86,21));for(let t of[-1,1])e.ell([t*8.4,42,11],[7.2,8.4,10.5],Yf);e.ell([0,33.5,-3],[9.8,11.2,14],$f(Yf,.4,.88,22)),e.cap([0,44,17],[0,43.4,-20],5.4,5.6,Yf,[1.2,.9,1]),e.ell([0,35,-17],[10.4,11.8,11],Yf);for(let t of[-1,1])e.ell([t*8,32.5,-18],[5.8,10.5,10.5],Yf);e.reown(`chest`,`hips`,(e,t,n)=>n<1),e.own(`neck`),e.cap([0,36,19],[0,38.8,30.5],10,8.4,$f(Yf,.35,.8,23)),e.scaled(Vf,Hf,()=>{e.own(`head`),e.ell([0,38.6,36.8],[9.3,7.9,8.7],Zf);for(let t of[-1,1])e.ell([t*8.6,34,34.4],[4.6,6.2,7],$f(Zf,.5,.8,24)),e.ell([t*4.6,43,40.2],[3.8,1.9,3.8],Zf);e.cap([0,40.2,39.5],[0,36.6,49],4.2,3.6,Zf),e.ell([0,35.4,45.6],[5.8,4.2,6.8],Zf);for(let t of[-1,1])e.ell([t*3.3,33.6,47.2],[3.2,2.3,4.4],(e,t,n)=>Kf(e,t,n,0));e.ell([0,37.2,51.6],[3.1,1.8,1.5],(e,t,n,r,i)=>i>.55?jf.nose:m(jf.nose,.8)),e.ell([0,38.2,52.2],[1.2,.5,.6],()=>jf.black);for(let t of[-1,1]){e.cap([t*3.4,32.5,50.2],[t*3.5,26,50.6],1.8,.35,()=>jf.tooth);for(let n=0;n<4;n++)e.cap([t*(.7+n*.5),31.6,52.2],[t*(.7+n*.5),30,52.2],.55,.3,()=>jf.tooth);e.stamp([t*5.1,40.6,43],[3.5,2.9,2.9],()=>jf.black,!0),e.stamp([t*5.3,40.6,43.5],[2.3,1.65,2],(e,t,n,r)=>r>.5?jf.eye:jf.eyeHi,!0,!0),e.stamp([t*5.6,40.6,44.2],[.7,1.7,1.1],()=>jf.black,!0,!1),e.stamp([t*7.4,39.2,41],[1.4,1,3.4],()=>jf.black,!0),e.stamp([t*5.8,44.2,42],[3.2,1.1,2.6],()=>jf.white,!0),e.stamp([t*3.4,41.8,46],[1.5,2.4,2.2],()=>jf.white,!0)}for(let t of[-1,1])e.own(`ear`+(t>0?`L`:`R`)),e.ell([t*7.4,45.6,33.4],[3.1,3.3,1.7],(e,t,n,r,i)=>n>=33.4&&i<.8?Kf(e,t,n,0):n>=33.4?qf(e,t,n):Math.abs(Math.abs(e)-7.4)<1.3&&Math.abs(t-45.6)<1.4?jf.white:qf(e,t,n));e.own(`jaw`);let t=.42,n=(e,n)=>[33.5+(e-33.5)*Math.cos(t)-(n-35)*Math.sin(t),35+(n-35)*Math.cos(t)+(e-33.5)*Math.sin(t)],r=(e,t,r)=>{let[i,a]=n(t,r);return[e,i,a]};e.cap(r(0,32.2,36),r(0,31.4,49),4.4,3.3,(e,t,n)=>Kf(e,t,n,0),[1.05,.62,1]),e.ell(r(0,30.8,50.2),[3.1,1.9,2.6],(e,t,n)=>Kf(e,t,n,0));for(let t of[-1,1]){e.cap(r(t*2.7,32.4,50.2),r(t*2.8,38,50.4),1.5,.3,()=>jf.tooth);for(let n=0;n<4;n++)e.cap(r(t*(.7+n*.5),32,52),r(t*(.7+n*.5),33.8,52),.55,.3,()=>jf.tooth);for(let n=0;n<3;n++)e.cap(r(t*(1.6+n*1.1),32.4,46-n*3),r(t*(1.6+n*1.1),34,46-n*3),.5,.25,()=>jf.tooth)}e.own(`head`);for(let t of[-1,1])for(let n=0;n<3;n++)e.line([t*5.6,35.2+n*.8-.8,49.2-n*.5],[t*(17-n*1),36.2+(n-1)*2.6,54+n*1.6-3.2],jf.white)}),e.paint((t,n,r,i,a,o,s,c)=>a===`jaw`&&i!==jf.tooth&&!e.has(o,s+1,c)&&Math.abs(t)<4?Math.abs(t)<1.8?jf.pinkHi:jf.pink:null),e.paint((t,n,r,i,a,o,s,c)=>a===`head`&&r>37&&r<55&&Math.abs(t)<4.6&&n>33.2&&n<34.8&&!e.has(o,s-1,c)?jf.pink:null);for(let t of[-1,1]){let n=t>0?`L`:`R`;e.own(`fU`+n),e.cap([t*9.2,31.5,14.5],[t*9.6,19,13],8.4,6.2,(e,n,r)=>Xf(e,n,r,t,9.6,30,0)),e.own(`fM`+n),e.cap([t*9.6,19,13],[t*9.6,8.5,15.8],6.2,4.7,(e,n,r)=>Xf(e,n,r,t,9.6,20,7)),e.own(`fP`+n),e.cap([t*9.6,8.5,15.8],[t*9.6,3.8,19.6],4.7,4.7,(e,n,r)=>Xf(e,n,r,t,9.6,8,0)),e.ell([t*9.6,3.2,22],[6.2,3.6,7.4],(e,t,n,r,i)=>n>25?Kf(e,t,n,+(i>.85)):Gf(e,t,n,.5));for(let n=-1;n<=1;n++)e.cap([t*9.6+n*2.4,1.7,27.8],[t*9.6+n*2.5,.9,30.4],1.1,.4,()=>jf.claw);e.line([t*9.6-1.2,3.4,28],[t*9.6-1.2,1.2,28.2],jf.black),e.line([t*9.6+1.2,3.4,28],[t*9.6+1.2,1.2,28.2],jf.black),e.own(`hU`+n),e.cap([t*9.8,32.5,-20],[t*10.5,21,-11.5],9.8,6.4,(e,n,r)=>Xf(e,n,r,t,9.8,32,0),[.95,1,1]),e.own(`hM`+n),e.cap([t*10.5,21,-11.5],[t*9.4,11,-24.5],6.4,4.5,(e,n,r)=>Xf(e,n,r,t,9.6,21,7)),e.own(`hP`+n),e.cap([t*9.4,11,-24.5],[t*9.2,4.8,-23],4.5,4.4,(e,n,r)=>Xf(e,n,r,t,9.6,8,0)),e.ell([t*9.4,3.2,-19.2],[6,3.6,7.2],(e,t,n,r,i)=>n>-15.5?Kf(e,t,n,+(i>.85)):Gf(e,t,n,.5));for(let n=-1;n<=1;n++)e.cap([t*9.4+n*2.4,1.7,-13.2],[t*9.4+n*2.5,.9,-10.4],1.1,.4,()=>jf.claw)}return e.own(`tail1`),e.cap([0,34.5,-24],[0,31.5,-38],5,4.3,(e,t,n)=>Qf(e,t,n,-999)),e.own(`tail2`),e.cap([0,31.5,-38],[0,27.5,-50],4.3,3.8,(e,t,n)=>Qf(e,t,n,-999)),e.own(`tail3`),e.cap([0,27.5,-50],[0,29,-64],3.8,3.3,(e,t,n)=>Qf(e,t,n,-60)),e.ell([0,29.3,-65],[3.2,3.2,3.2],()=>jf.black),e.paint((t,n,r,i,a,o,s,c)=>(a===`chest`||a===`hips`)&&!e.has(o,s+1,c)&&Uf(t,n,r,31)<.12?m(i,.9):null),e}var tp=[{id:`body`,parent:null,pivot:[0,31,0]},{id:`chest`,parent:`body`,pivot:[0,33,2]},{id:`neck`,parent:`chest`,pivot:[0,36,19]},{id:`head`,parent:`neck`,pivot:[0,37,30]},{id:`jaw`,parent:`head`,pivot:[0,33.5,35]},{id:`earL`,parent:`head`,pivot:[7.6,44.8,33.4]},{id:`earR`,parent:`head`,pivot:[-7.6,44.8,33.4]},{id:`fUL`,parent:`chest`,pivot:[9.2,31.5,14.5]},{id:`fML`,parent:`fUL`,pivot:[9.6,19,13]},{id:`fPL`,parent:`fML`,pivot:[9.6,8.5,15.8]},{id:`fUR`,parent:`chest`,pivot:[-9.2,31.5,14.5]},{id:`fMR`,parent:`fUR`,pivot:[-9.6,19,13]},{id:`fPR`,parent:`fMR`,pivot:[-9.6,8.5,15.8]},{id:`hips`,parent:`body`,pivot:[0,33,0]},{id:`hUL`,parent:`hips`,pivot:[9.8,32.5,-20]},{id:`hML`,parent:`hUL`,pivot:[10.5,21,-11.5]},{id:`hPL`,parent:`hML`,pivot:[9.4,11,-24.5]},{id:`hUR`,parent:`hips`,pivot:[-9.8,32.5,-20]},{id:`hMR`,parent:`hUR`,pivot:[-10.5,21,-11.5]},{id:`hPR`,parent:`hMR`,pivot:[-9.4,11,-24.5]},{id:`tail1`,parent:`hips`,pivot:[0,34.5,-24]},{id:`tail2`,parent:`tail1`,pivot:[0,31.5,-38]},{id:`tail3`,parent:`tail2`,pivot:[0,27.5,-50]}],np={front:[[31.5,14.5],[19,13],[8.5,15.8],[.4,21.5]],hind:[[32.5,-20],[21,-11.5],[11,-24.5],[.4,-19.2]]},rp=jf.S,ip=null;function ap(){ip||(ip=Lf(ep(),tp,jf.S));let e=at({vertexColors:!0,emissive:new N(0)}),{root:t,groups:n}=zf(ip,e),r=n;return{root:t,mat:e,parts:{body:r.body,chest:r.chest,hips:r.hips,neck:r.neck,head:r.head,jaw:r.jaw,ears:[r.earL,r.earR],legs:[{up:r.fUL,mid:r.fML,paw:r.fPL,front:!0},{up:r.fUR,mid:r.fMR,paw:r.fPR,front:!0},{up:r.hUL,mid:r.hML,paw:r.hPL,front:!1},{up:r.hUR,mid:r.hMR,paw:r.hPR,front:!1}],tail:[r.tail1,r.tail2,r.tail3]},tris:ip.tris}}var op=.75,sp=(e,t,n,r=0)=>l(Math.floor(e*op),Math.floor(t*op),Math.floor(n*op),r),cp=1.22,lp=[0,52,34],up=(e,t)=>e[Math.min(e.length-1,Math.floor(t*e.length))],dp=[Mf.olive,Mf.olive,Mf.oliveHi,Mf.oliveLo,Mf.olive,Mf.oliveHi],fp=[Mf.tan,Mf.tanHi,Mf.tan,Mf.tanLo],pp=[Mf.grey,Mf.greyHi,Mf.greyLo,Mf.grey,Mf.greyHi],mp=[Mf.belly,Mf.tanHi,Mf.belly,Mf.tan],hp=(e,t,n,r,i=.1,a=1)=>U(up(r,sp(e,t,n,a)),i,sp(e,t,n,a+40));function gp(e,t,n,r=.62){return Nf(e*.17+n*.1,t*.2+n*.06,5)+(sp(e,t,n,9)-.5)*.18>r?hp(e,t,n,fp,.1,3):hp(e,t,n,dp,.12,2)}function _p(e,t,n){let r=(t-43)/12.5,i=(sp(e,t,n,11)-.5)*.3;if(r+i>.66)return hp(e,t,n,pp,.1,4);if(r+i*.6<-.58||n>20&&r<-.2&&Math.abs(e)<6.5){let r=(n+40)%3.2<.8?.9:1;return m(hp(e,t,n,mp,.07,5),r)}return gp(e,t,n,.8)}function vp(e,t,n,r=!1,i=.5){return r&&sp(e,t,n,21)<.5?hp(e,t,n,pp,.1,6):gp(e,t,n,i)}function yp(e,t,n){return t<52&&n>44?hp(e,t,n,mp,.08,7):t<51.5?sp(e,t,n,19)<.7?hp(e,t,n,fp,.1,8):gp(e,t,n,.6):t>63.5&&n<56&&Math.abs(e)<5?hp(e,t,n,pp,.1,9):n>60&&t<55?gp(e,t,n,.35):gp(e,t,n,.7)}function bp(e,t,n,r){let i=(t-r)/6;return i>.55+(sp(e,t,n,12)-.5)*.3?hp(e,t,n,pp,.1,4):i<-.45?hp(e,t,n,mp,.08,5):gp(e,t,n,.58)}function xp(e,t,n,r,i){let a=[t[0]+n[0]*r,t[1]+n[1]*r,t[2]+n[2]*r];e.cap([t[0]-n[0]*1.5,t[1]-n[1]*1.5,t[2]-n[2]*1.5],a,i,.35,(e,t,n,r)=>U(v(Mf.greyLo,Mf.greyHi,r*.8+sp(e,t,n,31)*.2),.08,sp(e,t,n,32)))}function Sp(e,t,n,r,i){let a=[t],o=[[.4,0],[.34,-.5],[.28,-1.1]],s=t;for(let[e,t]of o)s=[s[0]+n[0]*r*e,s[1]+(n[1]+t)*r*e,s[2]+n[2]*r*e*(t<-1?.5:1)],a.push(s);let c=[i,i*.82,i*.58,.25];for(let t=0;t<3;t++)e.cap(a[t],a[t+1],c[t],c[t+1],(e,n,r,i)=>U(v(Mf.claw,Mf.clawTip,(t+i)/3),.1,sp(e,n,r,34)))}function Cp(e,t,n,r){e.cap(t,n,r,.2,(e,t,n,r)=>U(v(Mf.tooth,Mf.toothLo,1-r*.9),.04,sp(e,t,n,35)))}function wp(e,t,n,r,i=.9){let[a,o]=n,[s,c]=r,l=s-a,u=c-o,d=l*l+u*u;e.paint((n,r,s,c,f,p,m,h)=>{if(t*n<=0||e.has(p+t,m,h)||!e.exposed(p,m,h))return null;let g=z(((s-a)*l+(r-o)*u)/d,0,1),_=Math.hypot(s-(a+l*g),r-(o+u*g)),v=i*(1-Math.abs(g-.5)*.9);return _>v?null:_<v*.45?U(Mf.scarDeep,.1,sp(n,r,s,36)):U(Mf.scar,.12,sp(n,r,s,37))})}function Tp(){let e=new If(-34,0,-92,34,80,78,op);e.own(`torso`),e.ell([0,43,12],[12.4,13.8,15.5],_p),e.ell([0,43.5,-5],[12,13.2,14],_p),e.ell([0,43,-19],[12.6,13.2,12],_p);for(let t of[-1,1])e.ell([t*8.2,47.5,12.5],[4.8,6.5,8.5],_p),e.ell([t*8.6,41,-14],[5,8,9],_p);e.own(`neck`),e.cap([0,47,24],[0,53,36.5],10,8.8,(e,t,n)=>t<43.6+(n-24)*.35?hp(e,t,n,mp,.08,5):gp(e,t,n,.55),[.9,1,1]),e.scaled(cp,lp,()=>{e.own(`head`),e.ell([0,57.5,45],[9.4,8.4,11],yp),e.cap([0,57.8,50],[0,56.4,68.5],7.4,5.6,yp,[.86,.82,1]),e.ell([0,56.2,69],[4.8,4.6,2.8],yp);for(let t of[-1,1])e.ell([t*6.6,62.8,50],[3.4,2.3,6.6],(e,t,n)=>sp(e,t,n,13)<.45?hp(e,t,n,pp,.1,9):gp(e,t,n,.45)),e.ell([t*8.4,53,43],[2.8,5.2,8.6],(e,t,n)=>sp(e,t,n,14)<.7?gp(e,t,n,.5):hp(e,t,n,fp,.1,8)),e.ell([t*4.6,53.2,58],[2.2,1.7,8],(e,t,n)=>hp(e,t,n,fp,.1,8));e.own(`jaw`),e.cap([0,49.8,41],[0,48.4,66],5.6,4.3,(e,t,n,r,i)=>t>49.6?Mf.pink:hp(e,t,n,t<47?mp:fp,.08,7),[.92,.5,1]),e.ell([0,48,67.2],[3.6,2.5,2.4],(e,t,n)=>hp(e,t,n,mp,.08,7));for(let t of[-1,1])e.ell([t*5.2,49.5,43],[2.7,3.8,5.4],(e,t,n)=>gp(e,t,n,.5));for(let t=0;t<7;t++){let n=51+t*2.6;for(let r of[-1,1])Cp(e,[r*(4.3-t*.12),49.6,n],[r*(4.2-t*.12),49.6+(t===4?5.6:3.6+t%2),n+.5],t===4?1.15:.9)}for(let t=0;t<3;t++)Cp(e,[-1.6+t*1.6,49.4,68.2],[-1.6+t*1.6,53,68.4],.95);e.ell([0,50.8,50],[2.1,.9,11],(e,t,n,r,i)=>U(Mf.pinkHi,.06,sp(e,t,n,38))),e.own(`head`);for(let t=0;t<7;t++){let n=53+t*2.6,r=5.1-t*.08;for(let i of[-1,1]){let a=t===0||t===3;Cp(e,[i*r,52.2,n],[i*(r-.25),52.2-(a?6.6:4.4+t%2),n+.7],a?1.25:.95)}}for(let t=0;t<4;t++)Cp(e,[-2.2+t*1.5,52.2,69.6],[-2.2+t*1.5,47.6,70.1],1.05);for(let t of[-1,1])e.stamp([t*9.3,59.2,50],[4.2,4.2,4.2],(e,t,n)=>U(Mf.dark,.3,sp(e,t,n,39)),!0),e.stamp([t*9.6,59.2,50.2],[2.5,2.5,2.5],(e,t,n,r)=>r>.55?Mf.eye:Mf.eyeHi,!0,!0),e.stamp([t*9.9,59.2,50.6],[.7,2.1,1.1],()=>Mf.dark,!0,!1),e.stamp([t*3.2,60.4,70.4],[1.3,1.1,1.3],()=>Mf.dark,!0);for(let t of[-1,1])for(let n=0;n<5;n++)xp(e,[t*(3.6+n*.4),66.4-n*.2,54-n*3.4],[t*.3,.85,-.45],4.4-n*.35,1.7)});let t=[];for(let n of[-1,1]){let r=n>0?`L`:`R`;e.own(`aU`+r),e.cap([n*10.4,46,14],[n*14.6,36,8.5],6.8,5.6,(e,t,n)=>vp(e,t,n,!1,.6)),e.own(`aF`+r),e.cap([n*14.6,36,8.5],[n*13.2,26,21.5],5.6,4.1,(e,t,n)=>vp(e,t,n,!0,.4)),e.own(`aH`+r),e.ell([n*13.2,22.5,24.5],[5,3.8,5.8],(e,t,n)=>gp(e,t,n,.35));for(let t=-1;t<=1;t++){let r=n*(13.2+t*3.6);e.cap([r*1,22.6,25.5],[r+n*t*.8,18,33],2.3,1.7,(e,t,n)=>gp(e,t,n,.3)),Sp(e,[r+n*t*.8,18,33],[n*t*.12,-.4,.9],10,1.25)}t.push(r)}for(let t of[-1,1]){let n=t>0?`L`:`R`;e.own(`tU`+n),e.cap([t*11,39,-18],[t*12.6,29,-4],11.4,7,(e,t,n)=>vp(e,t,n,sp(e,t,n,1)<.5&&t>38,.6)),e.own(`tS`+n),e.cap([t*12.6,29,-4],[t*11,14,-19],6.6,3.9,(e,t,n)=>vp(e,t,n,!1,.45)),e.own(`tM`+n),e.cap([t*11,14,-19],[t*10.6,4.2,-10.5],3.9,3.6,(e,t,n)=>vp(e,t,n,n>-15&&sp(e,t,n,2)<.55,.35)),e.own(`tF`+n),e.ell([t*10.6,3.4,-9],[4.8,3,4.6],(e,t,n)=>gp(e,t,n,.3));for(let n=-1;n<=1;n++){let r=t*10.6+n*4.4,i=n===0?15:12;e.cap([t*10.6+n*1.2,3.8,-8],[r+n*1.4,2.4,-8+i],2.6,1.9,(e,t,n,r)=>t>3.6&&sp(e,t,n,3)<.5?hp(e,t,n,pp,.1,6):gp(e,t,n,.3)),Sp(e,[r+n*1.4,2.4,-8+i],[n*.08,-.3,.9],n===0?10:8.6,1.55)}Sp(e,[t*6.2,4,-9],[t*.05,-.1,.5],7,1.5),e.cap([t*12.4,6,-14],[t*6.8,9,-8],1.4,1.1,()=>Mf.claw)}e.own(`tail1`),e.cap([0,45,-26],[0,43.5,-46],9.2,6.6,(e,t,n)=>bp(e,t,n,43),[.88,.92,1]),e.own(`tail2`),e.cap([0,43.5,-46],[0,43.5,-63],6.6,4.4,(e,t,n)=>bp(e,t,n,43.5),[.88,.92,1]),e.own(`tail3`),e.cap([0,43.5,-63],[0,51,-84],4.4,1.4,(e,t,n,r)=>bp(e,t,n,43.5+r*7),[.9,.95,1]);let n=[],r=[0,.9,-.42];return[[`n`,30,59.5,8.2],[`n`,24,57.5,9.2],[`n`,18,56.2,9.6],[`t`,11,56.6,9],[`t`,3,56.2,8.2],[`t`,-5,56.2,7.6],[`t`,-13,56.4,7],[`t`,-21,56.6,6.4]].forEach(([t,i,a,o],s)=>{e.own(`sp`+s),xp(e,[0,a-1,i],r,o*.82,3),n.push({id:`sp`+s,parent:t===`n`?`neck`:`torso`,pivot:[0,a-1.5,i]})}),[[`tail1`,-32,52.6,5.6],[`tail1`,-39,51.4,5],[`tail2`,-48,49.6,4.4],[`tail2`,-56,48.4,3.6],[`tail3`,-66,47.6,3]].forEach(([t,i,a,o],s)=>{e.own(`ts`+s),xp(e,[0,a-1,i],r,o,2.1),n.push({id:`ts`+s,parent:t,pivot:[0,a-1.5,i]})}),wp(e,1,[-12,38],[-3,50],1),wp(e,1,[-14,44],[-6,51],.8),wp(e,1,[-8,37],[-2,44],.7),wp(e,-1,[4,36],[13,50],1),wp(e,-1,[0,38],[10,51],.8),wp(e,-1,[-14,40],[-6,49],.8),wp(e,-1,[-12,50],[-4,38],.7),wp(e,1,[48,52],[38,60],.9),wp(e,1,[50,49],[41,57],.7),wp(e,-1,[60,52],[48,61],.8),wp(e,1,[18,30],[4,36],.8),wp(e,-1,[-10,20],[-4,28],.7),wp(e,1,[10,28],[16,38],.7),e.paint((t,n,r,i,a,o,s,c)=>!e.has(o,s+1,c)&&sp(t,n,r,41)<.1?m(i,1.12):null),{R:e,spikes:n}}var Ep=[{id:`body`,parent:null,pivot:[0,40,0]},{id:`torso`,parent:`body`,pivot:[0,43,0]},{id:`neck`,parent:`torso`,pivot:[0,47,24]},{id:`head`,parent:`neck`,pivot:[0,53.4,36.6]},{id:`jaw`,parent:`head`,pivot:[0,50.3,41.4]},{id:`tail1`,parent:`torso`,pivot:[0,45,-26]},{id:`tail2`,parent:`tail1`,pivot:[0,43.5,-46]},{id:`tail3`,parent:`tail2`,pivot:[0,43.5,-63]}],Dp=[];for(let e of[-1,1]){let t=e>0?`L`:`R`;Dp.push({id:`aU`+t,parent:`torso`,pivot:[e*10.4,46,14]},{id:`aF`+t,parent:`aU`+t,pivot:[e*14.6,36,8.5]},{id:`aH`+t,parent:`aF`+t,pivot:[e*13.2,26,21.5]},{id:`tU`+t,parent:`torso`,pivot:[e*11,39,-18]},{id:`tS`+t,parent:`tU`+t,pivot:[e*12.6,29,-4]},{id:`tM`+t,parent:`tS`+t,pivot:[e*11,14,-19]},{id:`tF`+t,parent:`tM`+t,pivot:[e*10.6,4.2,-10.5]})}var Op=[[39,-18],[29,-4],[14,-19],[4.2,-10.5],[.6,-1]],kp=Mf.S,Ap=null;function jp(){if(!Ap){let{R:e,spikes:t}=Tp();Ap=Lf(e,[...Ep,...Dp,...t],Mf.S),Ap.spikeIds=t.map(e=>e.id)}let e=at({vertexColors:!0,emissive:new N(0)}),{root:t,groups:n}=zf(Ap,e),r=n;return{root:t,mat:e,parts:{body:r.body,torso:r.torso,neck:r.neck,head:r.head,jaw:r.jaw,arms:[`L`,`R`].map(e=>({up:r[`aU`+e],fore:r[`aF`+e],hand:r[`aH`+e]})),legs:[`L`,`R`].map(e=>({thigh:r[`tU`+e],shin:r[`tS`+e],meta:r[`tM`+e],foot:r[`tF`+e]})),tail:[r.tail1,r.tail2,r.tail3],spikes:Ap.spikeIds.map(e=>r[e])},tris:Ap.tris}}var Mp=Math.PI*2;function Np(e,t){let n=(t-e)%Mp;return n>Math.PI&&(n-=Mp),n<-Math.PI&&(n+=Mp),n}var Pp=(e,t,n,r)=>{e.yaw+=z(Np(e.yaw,t),-n*r,n*r)},Fp=(e,t,n=1/0)=>{t=Math.min(t,Math.max(0,n)*6),e.vx+=Math.sin(e.yaw)*t,e.vz+=Math.cos(e.yaw)*t},Ip=e=>e*e*(3-2*e);function Lp(e,t,n,r){e.rotation[t]+=(n-e.rotation[t])*r}function Rp(e,t){return e._bst!==e.state&&(e._bst=e.state,e._bt=0),e._bt+=t,e._bt}function zp(e,t){let n=e[0][0],r=e[0][1],i=0;for(let a=1;a<e.length;a++){let o=e[a][0]-e[a-1][0],s=e[a][1]-e[a-1][1];i+=t[a-1]||0;let c=Math.cos(i),l=Math.sin(i),u=o*c-s*l,d=o*l+s*c;n+=u,r+=d,o=u,s=d}return[n,r]}function Bp(e,t){let n=e.game,r=[];if(!n?.monsters)return r;for(let i of n.monsters)i===e||i.dead||i.type!==e.type||i.puppet||Math.hypot(i.x-e.x,i.z-e.z)<t&&r.push(i);return r}function Vp(e,t,n){if(t.dead)return!1;let r=t.pos.x-e.x,i=t.pos.z-e.z;if(Math.hypot(r,i)>n.reach||n.arc<Math.PI&&Math.abs(Np(e.yaw,Math.atan2(r,i)))>n.arc)return!1;let a=e.game.world.heightAt(t.pos.x,t.pos.z);return t.pos.y>a+(n.maxDy??1.25)||!t.hurt(n.dmg,e.x,e.z,n.knock)?!1:(e.game.fx.burst(t.pos.x,t.pos.y+1,t.pos.z,n.col,9,3.4,.09,.4),!0)}var Hp=e({FX:()=>Kp,animate:()=>cm,busy:()=>qp,dead:()=>lm,holdsWarn:()=>Jp,think:()=>em}),Up=[14711326,1511693,16117730],Wp=new Set([`windup`,`swipewind`]),Gp=new Set([`leap`,`swipe1`,`swipe2`,`swipe3`,`roar`]),Kp={spark:[16773824,16757575,16777215],burst:[14711326,1511693,16117730],death:[14711326,1511693,16117730,16767392],tele:16752704,accel:9,accelFn:e=>e.state===`stalk`?6.5:e.state===`recover`||e.state===`land`?14:10,knock:3.4,stun:.16,plateY:2,deathDur:1.7,heavy:!0,rage:!0,rageText:`Man-eater!`,noLift:!0},qp=e=>Gp.has(e.state),Jp=e=>Wp.has(e.state),Yp=e=>e.enraged||e.puppet&&e.hp<e.maxHp*.5?1.3:1,Xp={windup:.46,swipewind:.34,swipe1:.26,swipe2:.3,swipe3:.55,land:.5,recover:.55,roar:.95},Zp=(e,t)=>Wp.has(t)?Xp[t]/Yp(e):Xp[t];function Qp(e,t,n){let r=e.game;e.t=0,e.hitDone=!1,t===`pounce`?(e.state=`windup`,e.leapL=z(n+.8,5.2,8.6),e.warn(`line`,1.9,e.leapL,Zp(e,`windup`)),r.audio.tone(130,.42,`sawtooth`,.07,70)):(e.state=`swipewind`,e.warn(`line`,2.7,3.5,Zp(e,`swipewind`)),r.audio.tone(100,.3,`sawtooth`,.08,-20))}function $p(e,t,n,r,i,a){let o=Vp(e,t,{dmg:n,reach:r,arc:i,knock:a,col:Up});return o&&e.game.audio.hit?.(),o}function em(e,t,n){let{g:r,P:i,dx:a,dz:o,dist:s,sees:c,toP:l}=n,u=Yp(e),d=e.def,f=0,p=0,m=Math.hypot(e.x-e.home.x,e.z-e.home.z)>38;e.state===`chase`&&(e.state=`stalk`,e.t=0),e.weave===void 0&&(e.weave=Math.random()<.5?-1:1);let h=e.state,g=(t=`recover`)=>{e.state=t,e.t=0};if(e.enraged&&!e.roared&&!Wp.has(h)&&!Gp.has(h))return e.roared=!0,e.clearWarn(),g(`roar`),e.cd=.5,r.audio.tone(70,.9,`sawtooth`,.2,-25),r.shake(.25),[0,0];if(h===`idle`||h===`wander`){if(c&&!m)g(`stalk`),e.cd=Math.max(e.cd,.7+Math.random()*.7),e.weave=Math.random()<.5?-1:1;else{if(e.wanderT-=t,e.wanderT<=0){if(e.wanderT=3+Math.random()*4,Math.random()<.4)e.target={x:e.x,z:e.z};else{let t=Math.random()*Mp,n=Math.random()*8;e.target={x:e.home.x+Math.cos(t)*n,z:e.home.z+Math.sin(t)*n}}}let n=e.target.x-e.x,r=e.target.z-e.z,i=Math.hypot(n,r);if(i>.8){let a=m?2.4:1.15;f=n/i*a,p=r/i*a,Pp(e,Math.atan2(n,r),2.2,t)}}}else if(h===`stalk`){(!c&&s>d.aggro*1.5||m)&&(e.state=`idle`,e.target={x:e.home.x,z:e.home.z},e.wanderT=4),Pp(e,l,4.6*u,t);let n=z(1-(s-3)/Math.max(1,d.aggro-3),0,1),r=d.speed*u*(.26+.62*n*n+(e.hp<e.maxHp?.15:0));if(s>2.3){let t=a/s,n=o/s,i=Math.sin(e.t*1.25)*.32*e.weave;f=(t-n*i)*r,p=(n+t*i)*r}else s<1.1&&(f=-a/Math.max(s,.01)*d.speed*.3,p=-o/Math.max(s,.01)*d.speed*.3);e.cd<=0&&c&&(s<3.2?Qp(e,`swipe`,s):s<8.6&&s>(e.enraged?3.4:4.2)?Qp(e,`pounce`,s):e.cd=.2)}else if(h===`windup`){let n=Zp(e,h);if(e.t<n-.13&&Pp(e,l,7*u,t),e.t>n){let t=e.leapL||6;e.state=`leap`,e.t=0,e.leapT=z(t/12,.4,.65),e.leapFrom={x:e.x,z:e.z},e.leapDir={x:Math.sin(e.yaw),z:Math.cos(e.yaw)},e.vy=11*e.leapT,e.air=!0,r.fx.dust(e.x,e.y,e.z,7,1.6,11901546),r.audio.tone(110,.4,`sawtooth`,.11,190),r.shake(.08)}}else if(h===`leap`){let n=e.leapL||6,a=z(e.t/e.leapT,0,1);e.moveBy(e.leapFrom.x+e.leapDir.x*n*a-e.x,e.leapFrom.z+e.leapDir.z*n*a-e.z),!e.hitDone&&Math.hypot(i.pos.x-e.x,i.pos.z-e.z)<e.radius+.85&&$p(e,i,d.dmg+2,9,Math.PI,9)&&(e.hitDone=!0),Math.random()<t*40&&r.fx.emit(e.x+(Math.random()-.5),e.y+.5,e.z+(Math.random()-.5),0,-.4,0,Up[Math.floor(Math.random()*3)],.08,.35,0),(e.t>.18&&!e.air||e.t>e.leapT+.25)&&(e.air=!1,e.vy=0,e.state=`land`,e.t=0,r.fx.dust(e.x,e.y,e.z,8,1.8,11901546),r.fx.ring(e.x,e.y+.2,e.z,16752704,12,3.4,.1,.4),r.shake(.2),r.audio.tone(60,.3,`square`,.14,-20),!e.hitDone&&$p(e,i,d.dmg+1,e.radius+1.45,Math.PI,8)&&(e.hitDone=!0))}else h===`land`?e.t>Zp(e,h)&&(s<3&&u>1?(e.cd=0,g(`stalk`)):g()):h===`swipewind`?(Pp(e,l,6.5*u,t),e.t>Zp(e,h)&&(e.clearWarn(),g(`swipe1`),Fp(e,4.5,s-e.radius*.8),e.kick=1,r.audio.tone(90,.16,`square`,.11,-30))):h===`swipe1`?(!e.hitDone&&e.t>.08&&(e.hitDone=!0,$p(e,i,d.dmg,e.radius+1.55,1.1,6),r.shake(.08)),e.t>Zp(e,h)&&(g(`swipe2`),Pp(e,l,3,1),Fp(e,4,s-e.radius*.8))):h===`swipe2`?(Pp(e,l,4,t),!e.hitDone&&e.t>.1&&(e.hitDone=!0,$p(e,i,d.dmg,e.radius+1.6,1.15,7),r.shake(.1)),e.t>Zp(e,h)&&(u>1&&s<3.8?g(`swipe3`):g())):h===`swipe3`?(Pp(e,l,3,t),!e.hitDone&&e.t>.2&&(e.hitDone=!0,Fp(e,5,s-e.radius*.8),r.fx.ring(e.x+Math.sin(e.yaw)*1.3,e.y+.2,e.z+Math.cos(e.yaw)*1.3,16752704,10,3,.1,.4),$p(e,i,d.dmg+1,e.radius+1.7,1.3,9),r.shake(.16)),e.t>Zp(e,h)&&g()):h===`roar`?(Pp(e,l,2.5,t),e.t>Zp(e,h)&&(e.state=`stalk`,e.cd=.2,e.t=0)):h===`recover`?e.t>Zp(e,h)&&(e.state=`stalk`,e.t=0,e.cd=(.7+Math.random()*.7)/u):g(`stalk`);return[f,p]}var tm=[.8,-1.45,.95],nm=[-.6,1.05,-.65],rm=[-1.15,.1,-.35],im=[1,0,.35],am=[.25,.75,0,.5],om=[0,.5,.5,0];function sm(e){e.clearWarn?.(),e.state=`recover`,e.t=0,e.cd=.7}function cm(e,t,n){let r=e.model.parts,i=e.state,a=Rp(e,t),o=n.t;Yp(e);let s=n.spd,c=1-Math.exp(-15*t),l=1-Math.exp(-26*t);e.stun>0&&Wp.has(i)&&!e.puppet&&sm(e);let u=0,d=0,f=0,p=0,m=.12,h=-.12,g=0,_=.22,v=0,y=0,b=0,x=0,S=0,C=null,w=null,T=1.05,E=1;if(z(s/1.6,0,1),i===`stalk`||i===`chase`){let e=z(s/3.6,0,1);u=.86-e*.18,f=.5,p=-.28,m=.22+Math.sin(o*2.4)*.03,h=-.32,_=.12,g=.25+(1-e)*.3,v=.85,b=.42+e*.28,T=.62+e*.35,E=1.35}else if(i===`windup`){let t=z(a/Zp(e,i),0,1);u=.9+t*.1,f=.62,p=-.38,m=.3,h=-.2,g=1,v=1,S=Math.sin(a*36)*(.04+t*.08),x=t*.2}else if(i===`leap`){let t=z(a/(e.leapT||.5),0,1);d=Math.sin(t*Math.PI)*.5+(t>.5?(t-.5)*1.1:0),d=z(d,0,1),u=0,f=-.15,p=.05,m=.75,h=.2,_=.04,v=.6,y=-.1+t*.28}else if(i===`land`){let e=z(a/.5,0,1);u=1-e*.5,f=.35,m=.5*(1-e),h=-.1,v=.6}else if(i===`swipewind`){let t=z(a/Zp(e,i),0,1);u=.35+t*.35,f=.3,p=-.2,m=.55+t*.2,g=.6,v=1,x=t*.3,C={a:[1.2*t,.9*t,.2],k:1},w={a:[.2,.2,0],k:1}}else if(i===`swipe1`||i===`swipe2`||i===`swipe3`){let t=Zp(e,i),n=z(a/t,0,1),r=Ip(z(n*2.2,0,1));if(u=.25,f=-.1,p=.1,m=.85,v=1,x=.5,i===`swipe1`)C={a:[1.2-r*2.6,.9-r*1,.2],k:1},w={a:[.3,.3,0],k:1};else if(i===`swipe2`)w={a:[1.2-r*2.6,.9-r*1,.2],k:1},C={a:[.3,.3,0],k:1};else{let e=z(a/.2,0,1),t=Ip(z((a-.2)/.18,0,1)),n=[-1.5*e+(t>0?2.2*t:0),-.2,0];C={a:n,k:1},w={a:n,k:1},x=.8*(1-t*.6)}}else if(i===`roar`){let e=z(a/Xp.roar,0,1),t=Math.sin(z(e*1.15,0,1)*Math.PI);u=.1,f=-.55*t,p=-.4*t,m=.95*t+.1,v=.8,x=.35*t,h=.1,g=.4}else i===`recover`?(u=.35,f=.25,m=.1,h=-.2,v=.4):(u=0,f=Math.max(0,Math.sin(o*.7))*.08,p=-f*.5,b=.5,T=.9,m=.04,v=Math.max(0,Math.sin(o*.5+1))>.97?.4:0);n.hk>0&&(m+=n.hk*.4,v=1);let D=z(s/1.4,0,1),ee=z((s-2.4)/1.6,0,1);e.gaitC=(e.gaitC||0)+t*Mp*(s/T);let O=e.gaitC,k=b*(i===`idle`||i===`wander`?.8+ee*.5:1)*D,A=(.9+ee*.4)*E,j=[0,0,0,0],M=[];r.legs.forEach((e,t)=>{let n=e.front,r=(am[t]*(1-ee)+om[t]*ee)*Mp,i=O+r,a=n?tm:nm,o=n?rm:im,s=k*Math.sin(i),f=Math.max(0,-Math.sin(i+.6)),p=(n?1:.8)*A*f*k*2.2,m=n?-p*.35-s*.25:-p*.55+s*.2,h=[0,0,0];for(let e=0;e<3;e++)h[e]=a[e]*u*(1-d)+o[e]*d;if(h[0]+=s*(1-d),h[1]+=p*(1-d),h[2]+=m*(1-d),n){let e=t===0?C:w;e&&(h=[e.a[0],e.a[1],e.a[2]])}let g=C||w?l:c;Lp(e.up,`x`,h[0],g),Lp(e.mid,`x`,h[1],g),Lp(e.paw,`x`,h[2],g),e.up.rotation.z+=((n?(t===0?1:-1)*.05*u:0)-e.up.rotation.z)*c,M[t]=[e.up.rotation.x,e.mid.rotation.x,e.paw.rotation.x];let _=n?np.front:np.hind,v=_[_.length-1][0];j[t]=zp(_,M[t])[0]-v});let te=0,ne=0;if(i!==`leap`){let t=Math.min(j[0],j[1]),n=Math.min(j[2],j[3]),r=(t+n)/2,i=(t-n)/34;e._gD=(e._gD??r)+(r-(e._gD??r))*c,e._gA=(e._gA??i)+(i-(e._gA??i))*c,te=-z(e._gD,-2,16)*rp,ne=z(e._gA,-.5,.5)}else e._gD=0,e._gA=0;let re=Math.sin(O*2)*.012*D;te+=re,Lp(r.chest,`x`,y*.6-S*0,c),Lp(r.chest,`y`,Math.sin(O)*.05*D*(1-u*.5),c),Lp(r.hips,`x`,-y*.6,c),Lp(r.hips,`y`,Math.sin(O+Math.PI)*.06*D*(1-u*.5)+S,c);let ie=Math.sin(o*(i===`windup`?9:2.6))*(i===`windup`?.03:.014);r.chest.scale.y+=(1+ie-r.chest.scale.y)*c,Lp(r.neck,`x`,f,c),Lp(r.head,`x`,p,c),Lp(r.neck,`y`,n.lookSm*.45,c),Lp(r.head,`y`,n.lookSm*.5,c);let ae=m;return Lp(r.jaw,`x`,ae,l),r.ears.forEach((e,t)=>{let n=t===0?1:-1,r=Math.max(0,Math.sin(o*7+t*2.1))>.995?.5:0;Lp(e,`x`,-.75*v+r,c),Lp(e,`z`,-n*.55*v,c)}),r.tail.forEach((e,t)=>{let n=Math.sin(o*(g>.9?24:7.5)-t*.9)*g*(.2+t*.28);Lp(e,`y`,Math.sin(o*1.4-t*.8)*_*(1+t*.4)+n,c),Lp(e,`x`,h*(t===0?1:.55)+(t===2?.2:0)-y*.5,c)}),i===`windup`&&e.model.mat.emissive.setRGB(.35+Math.sin(o*28)*.12,.14,0),{rootY:te+0,rootX:ne-x*.5+(i===`leap`?-.1+z(a/(e.leapT||.5),0,1)*.5:0)}}function lm(e,t,n){let{u:r,ease:i,side:a,bs:o,dissolve:s}=n,c=e.obj,l=e.model.parts,u=i(z(r/.5,0,1)),d=a*1.5*u,f=1*o;c.rotation.set(0,e.yaw,d),c.position.set(e.x+f*Math.sin(d)*Math.cos(e.yaw)*-1*-1,e.y+Math.max(0,.42*u*o),e.z-f*Math.sin(d)*Math.sin(e.yaw)*-1*-1);let p=Math.exp(-z(r-.5,0,3)*5)*Math.sin(r*30)*.05;l.legs.forEach((e,t)=>{e.up.rotation.x=(e.front?-.7:.5)*u+p*(t%2?1:-1),e.mid.rotation.x=(e.front?-.3:.2)*u,e.paw.rotation.x=.15*u}),l.neck.rotation.x=.1*u,l.head.rotation.x=.35*u,l.jaw.rotation.x=.7*u,l.tail.forEach((e,t)=>{e.rotation.y=a*.4*u*(t+1)*.5,e.rotation.x=-.1*u}),l.ears.forEach(e=>{e.rotation.x=-.6*u}),l.chest.rotation.x=0;let m=s(1.05,.6,[14711326,1511693,16117730,16767392],4);c.scale.setScalar(o*(1-m*m))}var um=e({FX:()=>hm,animate:()=>wm,busy:()=>gm,dead:()=>Tm,holdsWarn:()=>_m,think:()=>Sm}),dm=[5662010,7084572,15655620],fm=new Set([`windup`,`bitewind`]),pm=new Set([`bite`,`leap`,`roar`]),mm=new Set([`windup`,`bitewind`,`bite`,`leap`,`land`]),hm={spark:[16773824,16757575,16777215],burst:[5662010,7084572,10132641,16777215],death:[5662010,9599820,7084572,10132641],tele:13189407,accel:12,accelFn:e=>e.state===`circle`?16:e.state===`chase`?13:e.state===`recover`||e.state===`land`?15:10,knock:3.2,stun:.18,plateY:2.35,deathDur:1.6,heavy:!0,rage:!0,rageText:`Pack Frenzy!`,noLift:!0},gm=e=>pm.has(e.state),_m=e=>fm.has(e.state),vm=e=>e.enraged||e.puppet&&e.hp<e.maxHp*.5?1.3:1,ym={windup:.46,bitewind:.26,bite:.22,land:.3,recover:.36,roar:.85},bm=(e,t)=>fm.has(t)?ym[t]/vm(e):ym[t];function xm(e,t,n){let r=e.game;e.t=0,e.hitDone=!1,t===`kick`?(e.state=`windup`,e.leapL=z(n+.6,3.4,7.2),e.warn(`line`,1.55,e.leapL,bm(e,`windup`)),r.audio.tone(320,.36,`sawtooth`,.06,260)):(e.state=`bitewind`,e.warn(`line`,1.5,2.6,bm(e,`bitewind`)),r.audio.tone(240,.2,`sawtooth`,.06,120))}function Sm(e,t,n){let{g:r,P:i,dx:a,dz:o,dist:s,sees:c,toP:l}=n,u=vm(e),d=e.def,f=0,p=0,m=Math.hypot(e.x-e.home.x,e.z-e.home.z)>38;e.circleT===void 0&&(e.circleT=0,e.ringR=3.4+Math.random()*1.8,e.orbit=e.orbitDir||(Math.random()<.5?-1:1));let h=e.state,g=(t=`recover`)=>{e.state=t,e.t=0};if(e.enraged&&!e.roared&&!fm.has(h)&&!pm.has(h))return e.roared=!0,e.clearWarn(),g(`roar`),e.cd=.4,r.audio.tone(260,.7,`sawtooth`,.14,-160),r.shake(.2),[0,0];if(h===`idle`||h===`wander`){if(c&&!m)g(`chase`),e.cd=.25+Math.random()*.3,r.audio.tone(380,.18,`sawtooth`,.05,-120);else{if(e.wanderT-=t,e.wanderT<=0){if(e.wanderT=1.2+Math.random()*2.4,Math.random()<.35)e.target={x:e.x,z:e.z};else{let t=Math.random()*Mp,n=Math.random()*7;e.target={x:e.home.x+Math.cos(t)*n,z:e.home.z+Math.sin(t)*n}}}let n=e.target.x-e.x,r=e.target.z-e.z,i=Math.hypot(n,r);if(i>.7){let a=m?3.2:1.7;f=n/i*a,p=r/i*a,Pp(e,Math.atan2(n,r),3.4,t)}}}else if(h===`chase`||h===`circle`){if(!c&&s>d.aggro*1.5||m)return e.state=`idle`,e.target={x:e.home.x,z:e.home.z},e.wanderT=3,[0,0];let n=d.speed*u,r=Bp(e,16),i=r.some(e=>mm.has(e.state)&&e.t<1.2),h=a/Math.max(s,.01),g=o/Math.max(s,.01),_=0,v=0;for(let t of r){let n=e.x-t.x,r=e.z-t.z,i=Math.hypot(n,r);if(i<3.4&&i>.01){let e=(3.4-i)/3.4;_+=n/i*e,v+=r/i*e}}if(r.length>0&&s<13&&s>1.8&&(i||e.circleT>0)){e.state!==`circle`&&(e.state=`circle`,e.t=0),e.circleT=Math.max(0,e.circleT-t),Pp(e,l,9,t);let r=z((s-e.ringR)*.7,-1,1);f=(h*r-g*e.orbit*.95)*n*.85+_*n*.9,p=(g*r+h*e.orbit*.95)*n*.85+v*n*.9}else{e.state!==`chase`&&(e.state=`chase`,e.t=0),Pp(e,l,9*u,t);let r=Math.sin(e.t*3.1+e.phase)*.12;s>1.7?(f=(h-g*r)*n+_*n*.6,p=(g+h*r)*n+v*n*.6):s<.9&&(f=-h*n*.45,p=-g*n*.45)}c&&e.cd<=0&&!(r.length>0&&i&&s>1.9)&&(s<2.5?xm(e,`bite`,s):s<7&&s>3&&(e.kickNext??Math.random()<.5)?xm(e,`kick`,s):e.cd=.18)}else if(h===`bitewind`)Pp(e,l,10*u,t),e.t>bm(e,h)&&(e.clearWarn(),g(`bite`),Fp(e,7.5,s-e.radius*.8),e.kick=1,r.audio.tone(200,.12,`square`,.1,-80));else if(h===`bite`)!e.hitDone&&e.t>.06&&(e.hitDone=!0,Vp(e,i,{dmg:d.dmg,reach:e.radius+1.7,arc:.95,knock:5,col:dm})&&r.audio.hit?.()),e.t>bm(e,h)&&(u>1&&!e.second&&s<3?(e.second=!0,xm(e,`bite`,s),e.t=.1):(e.second=!1,g()));else if(h===`windup`){let n=bm(e,h);if(e.t<n-.12&&Pp(e,l,8*u,t),e.t>n){let t=e.leapL||5;e.state=`leap`,e.t=0,e.leapT=z(t/14,.3,.5),e.leapFrom={x:e.x,z:e.z},e.leapDir={x:Math.sin(e.yaw),z:Math.cos(e.yaw)},e.vy=11*e.leapT,e.air=!0,r.fx.dust(e.x,e.y,e.z,6,1.3,11901546),r.audio.tone(180,.3,`sawtooth`,.1,220)}}else if(h===`leap`){let t=e.leapL||5,n=z(e.t/e.leapT,0,1);e.moveBy(e.leapFrom.x+e.leapDir.x*t*n-e.x,e.leapFrom.z+e.leapDir.z*t*n-e.z),!e.hitDone&&Math.hypot(i.pos.x-e.x,i.pos.z-e.z)<e.radius+.85&&Vp(e,i,{dmg:d.dmg+1,reach:9,arc:Math.PI,knock:8,col:dm,maxDy:1.1})&&(e.hitDone=!0,r.audio.hit?.()),(e.t>.14&&!e.air||e.t>e.leapT+.2)&&(e.air=!1,e.vy=0,e.state=`land`,e.t=0,r.fx.dust(e.x,e.y,e.z,6,1.4,11901546),!e.hitDone&&Vp(e,i,{dmg:d.dmg,reach:e.radius+1.2,arc:Math.PI,knock:6,col:dm})&&(e.hitDone=!0),e.vx-=e.leapDir.x*5.5,e.vz-=e.leapDir.z*5.5)}else h===`land`?e.t>bm(e,h)&&g():h===`roar`?(Pp(e,l,3,t),e.t>bm(e,h)&&(e.state=`chase`,e.cd=.15,e.t=0)):h===`recover`?e.t>bm(e,h)&&(e.state=`chase`,e.t=0,e.cd=(.45+Math.random()*.5)/u,e.kickNext=Math.random()<.5,Bp(e,16).length&&(e.circleT=1.1+Math.random()*1.4,e.orbit=Math.random()<.5?-1:1)):g(`chase`);return[f,p]}function Cm(e){e.clearWarn?.(),e.state=`recover`,e.t=0,e.cd=.5}function wm(e,t,n){let r=e.model.parts,i=e.state,a=Rp(e,t),o=n.t,s=n.spd,c=1-Math.exp(-16*t),l=1-Math.exp(-30*t);e.stun>0&&fm.has(i)&&!e.puppet&&Cm(e);let u=.25,d=0,f=0,p=0,m=0,h=.14,g=0,_=.2,v=[.35,-.9,.2],y=0,b=0,x=0,S=1.5,C=null,w=0;z(s/1.2,0,1);let T=z((s-1.8)/2.6,0,1);if(i===`chase`)u=.35,d=.2+T*.15,f=-.2,m=-.12,h=.36+Math.sin(o*9)*.04,v=[.6,-1.3,.3],y=.2,b=-.18,x=.62+T*.28,g=.06,_=.3;else if(i===`circle`)u=.5,d=.12,f=-.1,p=0,m=-.1,h=.3+Math.sin(o*6)*.06,v=[.2,-.7,.4],y=.55,x=.5,b=.05+Math.sin(o*6)*.05,_=.45,S=1.2;else if(i===`bitewind`){let t=z(a/bm(e,i),0,1);u=.6,d=-.12*t,f=-.55*t,m=.1,h=.85,v=[.4,-1.1,.3],w=.25,g=.1}else if(i===`bite`){let e=z(a/ym.bite,0,1),t=Ip(z(e*4,0,1));u=.5,d=.28,f=-.55+t*1.05,m=-.2*t,h=e<.3?.85*(1-t):.05,v=[-.3,-.6,.2],y=.4}else if(i===`windup`){let t=z(a/bm(e,i),0,1);u=1,d=.18*t,f=.1,m=-.3,h=.5,v=[.5,-1.2,.4],g=.25,w=.3,C=`coil`}else if(i===`leap`){let t=z(a/(e.leapT||.4),0,1);u=0,d=-.45,f=.1,m=-.1,h=.7,v=[-.9,-.2,0],y=.9,g=-.35,w=.4,C=`kick`,e._kickU=t}else if(i===`land`)u=.9,d=.1,f=.1,h=.2,v=[.3,-.8,.3],g=.1;else if(i===`roar`){let e=z(a/ym.roar,0,1),t=Math.sin(z(e*1.1,0,1)*Math.PI);u=.1,d=-.25*t,f=-.75*t,m=-.35*t,h=.1+.9*t,v=[-.35,-.5,.4],y=.8*t,w=.5*t,g=.15}else i===`recover`?(u=.3,f=-.15,h=.25,v=[.3,-1,.3],w=.1):(u=.28,d=.06,p=Math.sin(o*.9)*.6+(Math.sin(o*3.7)>.93?.35:0),f=-.1+Math.max(0,Math.sin(o*1.7))*.08,m=.05,h=.1+Math.max(0,Math.sin(o*.6))*.06,v=[.25,-1.15,.3],x=.48,S=1,b=Math.sin(o*1.5)*.04,_=.25);n.hk>0&&(h+=n.hk*.5,w+=n.hk*.4);let E=z(s/1.2,0,1);e.gaitC=(e.gaitC||0)+t*Mp*(s/S);let D=e.gaitC,ee=x*E,O=[];r.legs.forEach((t,n)=>{let r=D+n*Math.PI,i=ee*Math.sin(r),a=Math.max(0,-Math.sin(r+.55)),o=[0,0,0,0],s=u;o[0]=-.5*s+i,o[1]=.85*s+a*ee*2,o[2]=-.45*s-a*ee*.9,o[3]=.3*s+a*ee*.3-i*.5,C===`coil`?o=[-.95,1.5,-.85,.5]:C===`kick`&&(o=[-1.25+(e._kickU||0)*.25,.4,-.7,-.25]);let d=C?l:c;Lp(t.thigh,`x`,o[0],d),Lp(t.shin,`x`,o[1],d),Lp(t.meta,`x`,o[2],d),Lp(t.foot,`x`,o[3],d);let f=[t.thigh.rotation.x,t.shin.rotation.x,t.meta.rotation.x,t.foot.rotation.x];O[n]=zp(Op,f)[0]-Op[4][0]});let k=0;if(i!==`leap`){let t=Math.min(O[0],O[1]);e._gD=(e._gD??t)+(t-(e._gD??t))*c,k=-z(e._gD,-3,24)*kp}else e._gD=0;k+=Math.abs(Math.sin(D))*.012*E*T,r.arms.forEach((e,t)=>{let n=t===0?1:-1,r=-Math.sin(D+t*Math.PI)*.25*E;Lp(e.up,`x`,v[0]+r,c),Lp(e.fore,`x`,v[1]-Math.abs(r)*.3,c),Lp(e.hand,`x`,v[2],c),Lp(e.up,`z`,-n*y,c),Lp(e.hand,`z`,n*y*.2,c)});let A=Math.sin(o*3.4)*.012;return r.torso.scale.y+=(1+A-r.torso.scale.y)*c,Lp(r.torso,`y`,Math.sin(D)*.05*E*T,c),Lp(r.neck,`x`,f-d*.6,c),Lp(r.neck,`y`,p+n.lookSm*.5-Math.sin(D)*.05*E,c),Lp(r.head,`x`,m-d*.3,c),Lp(r.head,`y`,n.lookSm*.4,c),Lp(r.jaw,`x`,h,l),r.tail.forEach((t,n)=>{Lp(t,`y`,Math.sin(o*(i===`circle`?5:2.2)-n*.9+(e.phase||0))*_*(.7+n*.4)-Math.sin(D)*.12*E*T*(n+1),c),Lp(t,`x`,g*(1+n*.3)+d*.7*(n===0?1:.3),c)}),r.spikes.forEach((e,t)=>{Lp(e,`x`,b+w+Math.sin(o*5.5-t*.55)*(.05+w*.2),c)}),i===`windup`&&e.model.mat.emissive.setRGB(.32+Math.sin(o*28)*.12,.05,.02),{rootY:k,rootX:d*.55}}function Tm(e,t,n){let{u:r,ease:i,side:a,bs:o,dissolve:s}=n,c=e.obj,l=e.model.parts,u=i(z(r/.55,0,1)),d=a*Math.PI*.93*u,f=1.1*o,p=-f*Math.sin(d),m=f*Math.cos(d),h=f+(.45*o-f)*u;c.rotation.set(0,e.yaw,d),c.position.set(e.x-p*Math.cos(e.yaw),e.y+(h-m),e.z+p*Math.sin(e.yaw));let g=Math.exp(-z(r-.55,0,3)*4)*Math.sin(r*26)*.12,_=i(z((r-.1)/.7,0,1));l.legs.forEach((e,t)=>{e.thigh.rotation.x=-.9*_+g*(t?1:-1),e.shin.rotation.x=1.1*_,e.meta.rotation.x=-.7*_,e.foot.rotation.x=.5*_}),l.arms.forEach((e,t)=>{e.up.rotation.x=-.6*_,e.fore.rotation.x=-1*_+g,e.hand.rotation.x=.4*_,e.up.rotation.z=(t?1:-1)*.3*_}),l.neck.rotation.x=-.5*u,l.head.rotation.x=-.3*u,l.jaw.rotation.x=.8*u,l.tail.forEach((e,t)=>{e.rotation.x=.35*_,e.rotation.y=a*.5*_*(t+1)*.5}),l.spikes.forEach(e=>{e.rotation.x=-.25*_});let v=s(1.05,.5,[5662010,9599820,7084572,10132641],4);c.scale.setScalar(o*(1-v*v))}var Em=e({DEFS:()=>km,FX:()=>Am,TYPES:()=>Om,animate:()=>Pm,busy:()=>jm,dead:()=>Fm,holdsWarn:()=>Mm,think:()=>Nm}),Dm={tiger:Hp,raptor:um},Om=new Set([`tiger`,`raptor`]),km={tiger:{name:`Bengal Tiger`,hp:120,radius:.9,speed:4.4,dmg:5,gold:[30,50],aggro:16,build:ap},raptor:{name:`Battle Raptor`,hp:90,radius:.75,speed:4.8,dmg:4,gold:[25,45],aggro:16,build:jp}},Am={tiger:Kp,raptor:hm},jm=e=>Dm[e.type].busy(e),Mm=e=>Dm[e.type].holdsWarn(e),Nm=(e,t,n)=>Dm[e.type].think(e,t,n),Pm=(e,t,n)=>Dm[e.type].animate(e,t,n),Fm=(e,t,n)=>Dm[e.type].dead(e,t,n),Im=.019,Lm={navy:[1713744,2109020,2635880,3162746,3821196],navyDark:[1252154,1581638,1910864],gold:[9071140,10846767,12425273,13741644],goldDark:[7032604,8215842],leather:[3876891,4862755,5915184,6967098],leatherDark:[2365456,3022613],pants:[2891543,3483164,4140578,4863783],boot:[3811356,4731685,5718063,6769720],skin:[12155732,12946016,13604457,14196852],skinShade:[10117954,11038025],hair:[986380,1578002,2235159],shirt:[13617336,14275524,14999506,12169890],red:[8264740,10102320,11678266,12860996],hat:[2826784,3549991,4273198,5193526],steel:[8158854,9540507,10922160,12369606],bone:[13221791,14274484,15129794,15853778],boneDark:[9405542,10523764],blood:[5900816,7999512,10098206,12066856],ghost:[7012250,12124112,3856506]},Rm={navy:[1843766,2304576,2831181,3489626,4016230],navyDark:[1316902,1646127,2041144],gold:[7230504,8610863,9991480,11373122],goldDark:[5126946,6179370],leather:[2825492,3614234,4469023,5454631],leatherDark:[1839628,2497041],pants:[2234639,2826262,3483676,4206885],boot:[2760214,3417627,4206370,5126699],shirt:[7233608,8549466,9667946,5918266],red:[4855065,6036255,7217702,8399662],hat:[2300695,2892574,3615781,4404781],hatTrim:[4864804,5917228,6969396],steel:[7236200,8354681,9473162,10723486],rust:[4856338,6038294,7220250],bone:[10259324,11180426,12101529,13022630],boneDark:[7233362,8286050],blood:[4065806,5377554,6951704]},zm={overhead:{wind:.62,strike:.26,recover:.5},side:{wind:.4,strike:.22,recover:.4},lunge:{wind:.5,dash:.3,recover:.7}},Bm={combo:{wind:.7,strike1:.26,link:.2,strike2:.28,recover:.8},smash:{wind:.85,strike:.3,recover:.9}},Vm={...Lm,...Rm},Hm=Lm;function Um(e){Hm=e?Vm:Lm}var Wm=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],Gm=(e,t,n,r,i,a=.05)=>{let o=l(t>>1,n>>1,r>>1,i)*.6+l(t,n,r,i+1)*.4;return U(e[Math.min(e.length-1,Math.floor(o*e.length))],a,l(t,n,r,i+2))},Km=(e,t,n)=>1+(l(e,0,t>>1,n)-.5)*.2,Q={navy:(e,t,n)=>m(Gm(Hm.navy,e,t,n,11,.07),Km(e,n,5)),navyDark:(e,t,n)=>Gm(Hm.navyDark,e,t,n,13,.05),gold:(e,t,n)=>Gm(Hm.gold,e,t,n,17,.05),goldDark:(e,t,n)=>Gm(Hm.goldDark,e,t,n,18,.05),leather:(e,t,n)=>Gm(Hm.leather,e,t,n,19,.06),leatherDark:(e,t,n)=>Gm(Hm.leatherDark,e,t,n,20,.05),pants:(e,t,n)=>m(Gm(Hm.pants,e,t,n,23,.06),Km(e,n,9)),boot:(e,t,n)=>Gm(Hm.boot,e,t,n,29,.07),skin:(e,t,n)=>Gm(Hm.skin,e,t,n,31,.035),hair:(e,t,n)=>Gm(Hm.hair,e,t,n,37,.1),shirt:(e,t,n)=>Gm(Hm.shirt,e,t,n,41,.04),red:(e,t,n)=>Gm(Hm.red,e,t,n,43,.06),hat:(e,t,n)=>Gm(Hm.hat,e,t,n,47,.07),steel:(e,t,n)=>Gm(Hm.steel,e,t,n,53,.05),bone:(e,t,n)=>Gm(Hm.bone,e,t,n,59,.035),boneDark:(e,t,n)=>Gm(Hm.boneDark,e,t,n,61,.05),blood:(e,t,n)=>Gm(Hm.blood,e,t,n,67,.08),hatTrim:(e,t,n)=>Gm(Hm.hatTrim,e,t,n,71,.05),rust:(e,t,n)=>Gm(Hm.rust,e,t,n,73,.08)},qm=1182986,Jm=(e,t,n,r,i=3.4)=>Math.abs(e/n)**i+Math.abs(t/r)**i<=1;function Ym(e,t,n){let r=[];for(let n=0;n<e.sz;n++)for(let i=0;i<e.sy;i++)for(let a=0;a<e.sx;a++)!e.has(a,i,n)&&t(a,i,n)&&Wm.some(([t,r,o])=>e.has(a+t,i+r,n+o))&&r.push([a,i,n]);for(let[t,i,a]of r){let r=typeof n==`function`?n(t,i,a):n;r!=null&&e.set(t,i,a,r)}}function Xm(e,t,n){for(let r=0;r<e.sz;r++)for(let i=0;i<e.sy;i++)for(let a=0;a<e.sx;a++){if(!e.has(a,i,r)||!t(a,i,r))continue;let o=typeof n==`function`?n(a,i,r):n;o!=null&&e.set(a,i,r,o)}}var Zm=e=>(e&255)-(e>>16&255)>12&&!(e>>24);function Qm(e,{patch:t=.16,bone:n=.05,nibble:r=.1,seed:i=0,keep:a=null}={}){let o=[];for(let s=0;s<e.sz;s++)for(let c=0;c<e.sy;c++)for(let u=0;u<e.sx;u++){let d=e.get(u,c,s);if(!d||!Zm(d&16777215)||a&&a(u,c,s))continue;let f=l(u+i>>1,c>>1,s+i>>1,301);f<n?e.set(u,c,s,m(Q.boneDark(u,c,s),.9)):f<t&&e.set(u,c,s,v(Q.leatherDark(u,c,s),Q.navyDark(u,c,s),.3+l(u,c,s,302)*.3)),Wm.some(([t,n,r])=>(t||r)&&!e.has(u+t,c+n,s+r))&&l(u+i,c,s,303)<r&&o.push([u,c,s])}for(let[t,n,r]of o)e.clear(t,n,r)}function $m(e,t,n){for(let r=e.sz-1;r>=0;r--)if(e.has(t,n,r))return r;return-1}function eh(e,t,n){let r=new W(e.sx,e.sy,e.sz);for(let i=0;i<e.sz;i++)for(let a=0;a<e.sy;a++)for(let o=0;o<e.sx;o++)(n>0?o>=t:o<t)&&e.has(o,a,i)&&(r.data[r.idx(o,a,i)]=e.data[e.idx(o,a,i)]);return r}var th={ox:15,oy:2,oz:9};function nh(e){Um(e);let t=new W(30,34,18),n=t=>e?8.7+1.1*he(4,18,t):9.7+1.4*he(4,18,t),r=t=>e?5.1+.7*he(4,16,t):5.4+.8*he(4,16,t),i=t=>e?6.2:3.2+1.4*he(7,24,t),a=e=>e+.5-15,o=e=>e+.5-9;t.box(0,0,0,t.sx,28,t.sz,(e,t,i)=>{let s=a(e);return t+.5>27-Math.max(0,Math.abs(s)-6.5)*.45?null:Jm(s,o(i),n(t),r(t),3.2)?Q.navy(e,t,i):null}),t.box(0,24,0,t.sx,32,t.sz,(t,n,r)=>Jm(a(t),o(r),3.4,3.1,3)?e?Q.boneDark(t,n,r):m(Q.skin(t,n,r),.82):null);let s=(t,n,s)=>n>=7&&n<=26&&o(s)>r(n)-3.4&&Math.abs(a(t))<i(n)+(e?(l(t,n,0,3)-.5)*1.4:0);if(e){for(let e=0;e<t.sz;e++)for(let n=7;n<=26;n++)for(let r=0;r<t.sx;r++)t.has(r,n,e)&&s(r,n,e)&&o(e)>-3.2&&t.clear(r,n,e);for(let e=8;e<=26;e++){let n=5.5+1.6*Math.sin(he(6,17,e)*Math.PI*.5)-.5*he(19,26,e);for(let r=0;r<t.sz;r++)for(let i=0;i<t.sx;i++){let s=a(i),c=o(r)-.3;c>-3.3&&(s/n)**2+(c/4.3)**2<=1&&t.set(i,e,r,m(Q.shirt(i,e,r),.7+(i&1)*.22+(e%3==2?-.12:0)))}}for(let e of[8,10,12,14,16,18,20]){let n=5.5+1.6*Math.sin(he(6,17,e)*Math.PI*.5)-.5*he(19,26,e);for(let r=0;r<Math.PI*2;r+=.04){let i=Math.floor(15+n*Math.sin(r)),a=Math.floor(9.3+4.3*Math.cos(r));a<6||(t.set(i,e,a,Q.bone(i,e,a)),t.set(i,e+1,a,Q.bone(i,e+1,a)),Math.cos(r)>.3&&t.set(i,e,a+1,m(Q.bone(i,e,a),1.05)))}}for(let e=8;e<=22;e++){let n=$m(t,14,e)+1,r=e<12?1:2;for(let i=15-r;i<15+r;i++)t.set(i,e,n,Q.bone(i,e,n))}for(let e of[-1,1])for(let n=0;n<8;n++){let r=Math.floor(15+e*(1+n)-0),i=24-(n>>2),a=$m(t,r,i)+1;t.set(r,i,a,Q.bone(r,i,a)),t.set(r,i+1,a,m(Q.bone(r,i,a),.9))}for(let e=8;e<=25;e++){let n=!(e&3);for(let r=14;r<=15;r++)t.set(r,e,6,n?qm:Q.boneDark(r,e,6))}}else{for(let e=0;e<t.sz;e++)for(let n=7;n<=26;n++)for(let i=0;i<t.sx;i++){if(!t.has(i,n,e)||!s(i,n,e))continue;let c=o(e);if(c>r(n)-1.3){t.clear(i,n,e);continue}let l=a(i);if(n>=21&&Math.abs(l)<(n-19.2)*.62&&c>r(n)-2.6)t.set(i,n,e,m(Q.skin(i,n,e),.9));else{let a=Math.floor(l*.9)+(n>>2)&1?.9:1;t.set(i,n,e,m(Q.shirt(i,n,e),a*(c>r(n)-2?1:.85)))}}for(let e=11;e<=21;e+=2){let n=$m(t,14,e);n<0||(t.set(14,e,n,9074262),t.set(15,e,n,9074262),t.set(13+(e>>1&1)*3,e+1,n,10126950))}for(let e of[14,15])for(let n=9;n<12;n++)t.set(e,n,$m(t,e,n),9074262)}let c=(e,t,n)=>o(n)>1&&t>=7&&t<=26,u=(t,n,r)=>{if(!c(t,n,r))return null;let o=Math.abs(a(t))-i(n);return o<0?null:o<1.1?e?l(t,n>>1,0,74)<.3?Q.goldDark(t,n,r):m(Q.navyDark(t,n,r),1.25):a(t)>0?Q.gold(t,n,r):Q.goldDark(t,n,r):e||n<13+o*1.6||o>3.6?null:o>2.7&&a(t)>0&&l(t,n,0,72)<.7?Q.goldDark(t,n,r):m(Q.navy(t,n,r),1.14)},d=t.data.slice();Ym(t,(e,t,n)=>u(e,t,n)!==null,(e,t,n)=>u(e,t,n));for(let n of e?[]:[8,11,14,17,20,23]){let e=Math.floor(15-i(n)-2.5),r=$m(t,e,n)+1;t.set(e,n,r,Q.gold(e,n,r)),t.set(e,n+1,r,m(Q.gold(e,n,r),1.12))}if(e)for(let e of[-1,1])for(let n of[9,12,15,18,21]){if(l(e,n,0,75)<.25)continue;let r=Math.floor(15+e*(i(n)+1.2)-+(e<0)),a=$m(t,r,n);if(!(a<0))for(let e=0;e<2;e++)for(let i=0;i<2;i++)t.set(r+e,n+i,a+1,e+i===1?Q.goldDark(r,n,a):Q.gold(r,n,a))}t.box(0,24,0,t.sx,30,t.sz,(t,n,r)=>{let i=a(t),s=o(r);return n<24||n>29||!Jm(i,s,6.3,5,3)||Jm(i,s,4.6,3.4,3)||s>0&&Math.abs(i)<2.6||n>(s>0?27:29)-(e?2:0)?null:n===(s>0?27:29)-(e?2:0)?e?Q.goldDark(t,n,r):Q.gold(t,n,r):n>25?m(Q.navy(t,n,r),1.12):Q.navy(t,n,r)}),t.box(0,24,0,t.sx,30,t.sz,(t,n,r)=>{let i=a(t),s=o(r);return!e&&s>0&&Math.abs(i)>=2.6&&Math.abs(i)<3.8&&n>=24&&n<=27&&Jm(i,s,6.3,5,3)?Q.gold(t,n,r):null});let f=e=>17.5-(e+.5-12.5)*.95,p=(e,t,n)=>t>=7&&t<28&&Math.abs(t+.5-f(e))<1.9,h=(e,t,n)=>Math.abs(t+.5-f(e))>1.45?Q.leatherDark(e,t,n):l(e,t,n,81)<.07?m(Q.leather(e,t,n),1.25):Q.leather(e,t,n);Ym(t,(e,t,n)=>p(e,t,n)&&s(e,t,n),h),Ym(t,p,h),Ym(t,(e,t,n)=>t>=2&&t<7,(e,t,n)=>t===2||t===6?Q.leatherDark(e,t,n):t===4&&(e+n)%3==0?m(Q.leatherDark(e,t,n),.8):Q.leather(e,t,n)),Ym(t,(e,t,n)=>t>=2&&t<7&&(e+n)%5==0&&t===3,(e,t,n)=>m(Q.leather(e,t,n),1.2));let g=(e,t,n,r,i,a,s,c)=>(l,u,d)=>o(d)<0||l<e||l>=e+n||u<t||u>=t+r||l>=i&&l<i+s&&u>=a&&u<a+c?null:l===e||l===e+n-1||u===t||u===t+r-1?m(Q.gold(l,u,d),1.05):Q.gold(l,u,d),_=g(11,1,8,7,13,3,4,3);Ym(t,(e,t,n)=>_(e,t,n)!==null,_);for(let e=13;e<16;e++){let n=$m(t,e,4)+0;n>=0&&t.get(e,4,n)&&t.get(e,4,n)&16777215&&t.set(e,4,n,Q.goldDark(e,4,n))}let v=g(9,14,7,7,11,16,3,3);Ym(t,(e,t,n)=>v(e,t,n)!==null,v);for(let e=11;e<14;e++){let n=$m(t,e,17);n>=0&&t.set(e,17,n,Q.leatherDark(e,17,n))}Ym(t,(e,t,n)=>o(n)>0&&e>=20&&e<25&&t>=0&&t<8&&t>1+(e-20)*.1,(e,t,n)=>t===7||e===20?Q.leatherDark(e,t,n):Q.leather(e,t,n)),Ym(t,(e,t,n)=>o(n)>0&&e>=20&&e<25&&t>=1&&t<8,(e,t,n)=>t>=6?m(Q.leather(e,t,n),.8):Q.leather(e,t,n));for(let e=8;e<26;e++)for(let n=0;n<t.sz;n++)if(t.has(14,e,n)){o(n)<0&&!p(14,e,n)&&(t.set(14,e,n,m(t.get(14,e,n)&16777215,.78)),t.set(15,e,n,m(t.get(15,e,n)&16777215,.78)));break}return be(t,d),e&&Qm(t,{patch:.36,bone:.08,nibble:.15,seed:1}),t}var rh={ox:11,oy:4,oz:11};function ih(e){Um(e);let t=new W(22,26,22),n=e=>e+.5-11,r=e=>e+.5-11,i=e=>e-4;if(e){t.box(0,6,0,t.sx,18,t.sz,(e,t,a)=>{let o=i(t),s=n(e),c=r(a),u;if(u=o>=5?Jm(s,c,6.4,6.3,2.7+Math.max(0,o-11)*.35):o>=3?Jm(s,c,5.9,5.6,3.4):Jm(s,c,4.7,5.1,3.4),!u)return null;let d=Q.bone(e,t,a),f=l(e>>1,t>>1,a>>1,97);return f<.16?v(d,5128240,.42):f>.93?m(d,.8):o<3?m(d,.9):o>=9?m(d,.85):d});let e=(e,n)=>$m(t,e,4+n);for(let[n,r]of[[5,9],[13,17]]){for(let i=4;i<=7;i++)for(let a=n;a<r;a++){let o=a===(n===5?n:r-1);if((a===n||a===r-1)&&(i===4||i===7)||i===4&&o)continue;let s=e(a,i);if(!(s<0)){for(let e=0;e<3;e++)t.clear(a,4+i,s-e);for(let e=3;e<5;e++)t.set(a,4+i,s-e,722693)}}let i=n===5?7:14,a=e(i,5);t.set(i,9,a-3,3129194,!0),t.set(i,9,a-2,9240500,!0)}for(let[n,r]of[[10,3],[11,3],[10,2],[11,2],[9,2],[12,2]]){let i=e(n,r);if(!(i<0)){for(let e=0;e<3;e++)t.clear(n,4+r,i-e);for(let e=3;e<5;e++)t.set(n,4+r,i-e,722693)}}for(let n of[10,11]){let r=e(n,4);r>=0&&t.set(n,8,r,m(Q.bone(n,4,r),1.12))}for(let n=5;n<=16;n++){let r=e(n,8);r>=0&&n!==10&&n!==11&&t.set(n,12,r+1,m(Q.bone(n,8,r),.92))}for(let n of[4,5,16,17])for(let r of[3,4]){let i=e(n,r);i>=0&&t.set(n,4+r,i+1,m(Q.bone(n,r,i),1.1))}for(let n=6;n<=15;n++){let r=e(n,2);r<0||(t.set(n,6,r,n%2==0?m(Q.bone(n,2,r),1.12):3155482),t.set(n,6,r+1,n%2==0?m(Q.bone(n,2,r),1.2):3155482),n>6&&n<15&&e(n,7)>=0&&t.set(n,11,e(n,7)+1,m(Q.bone(n,7,0),1.08)))}for(let n=0;n<8;n++){let r=12+(n>>1),i=13-n,a=e(r,i);i>=9&&a>=0&&t.set(r,4+i,a,3813410)}t.box(10,0,7,12,3,9,(e,t,n)=>t&1?Q.boneDark(e,t,n):Q.bone(e,t,n))}else{t.box(0,4,0,t.sx,16,t.sz,(e,t,a)=>{let o=i(t),s=(o<1?4.7:o<2?5.2:6)-Math.max(0,o-9.5)*.7,c=6-Math.max(0,o-9.5)*.7;if(!Jm(n(e),r(a),s,c,4))return null;let l=Math.abs(n(e)),u=o<1?.8:o<2?.9:o<4&&l>3?1.05:1;return o>=3&&o<=4&&l>3.5&&l<5.5&&r(a)>2&&(u*=1.06),m(Q.skin(e,t,a),u)}),Xm(t,(e,t,a)=>{let o=i(t),s=r(a),c=Math.abs(n(e));return o>=2&&o<=11&&(s<-2.3||c>4.9&&s<3.2||o>=10)},(e,t,n)=>Q.hair(e,t,n));for(let e=5;e<17;e++){let n=-3+Math.floor(l(e,0,0,91)*3.5);for(let r=n;r<9;r++){let n=4+ +(l(e,r,0,92)<.25);for(let i=0;i<2;i++)t.set(e,4+r,n+i,Q.hair(e,4+r,n+i))}}for(let e of[-1,1])for(let n=1;n<9;n++){let r=1+Math.floor(l(e,n,0,93)*2);if(n<r)continue;let i=e<0?4:17;for(let e=6;e<=11+ +(n>5);e++)(e+n)%5!=0&&t.set(i,4+n,e,Q.hair(i,4+n,e))}for(let e of[-1,1]){let n=e<0?5:16;for(let r of[4,5,6])t.set(n+(e<0?-1:1),4+r,11,m(Q.skin(n,r,0),.88))}let e=(e,n)=>$m(t,e,4+n),a=(n,r,i,a=0)=>{let o=e(n,r);o>=0&&t.set(n,4+r,o+a,i)};for(let e of[[7,8,9],[14,13,12]])a(e[0],6,15327954),a(e[1],6,1839628),a(e[2],6,14077887),a(e[0],5,m(Q.skin(e[0],5,0),.8)),a(e[1],5,m(Q.skin(e[1],5,0),.84)),a(e[2],5,m(Q.skin(e[2],5,0),.86));for(let[e,t]of[[6,0],[7,0],[8,-0],[9,0],[12,0],[13,0],[14,0],[15,0]]){let n=e===9||e===12;a(e,7,Q.hair(e,7,0),0),a(e,7,m(1708560,1+t),1),n&&a(e,6,m(Q.skin(e,6,0),.6),0)}for(let e of[10,11]){for(let t of[4,5,6])a(e,t,m(Q.skin(e,t,0),1.06),1);a(e,4,m(Q.skin(e,4,0),1.1),2),a(e,3,m(Q.skin(e,3,0),.72),1)}a(9,4,m(Q.skin(9,4,0),.82),0),a(12,4,m(Q.skin(12,4,0),.82),0);for(let e=8;e<=13;e++)a(e,2,6959654,0);a(13,3,8012340,0),a(8,1,m(Q.skin(8,1,0),.9),0);for(let e=9;e<=12;e++)a(e,1,m(Q.skin(e,1,0),.9),0);for(let e of[6,7,15,16])a(e,3,m(Q.skin(e,3,0),.8),0);for(let e of[9,10,11,12])a(e,0,m(Q.skin(e,0,0),.75),0)}let a=e?10:8,o=(e,t,n)=>{let r=i(t);return r>=a&&r<=a+3},s=t.data.slice(),c=(t,n,r)=>{let o=i(n);return e&&l(t,n,r,5)<.08?null:o===a||o===a+3?m(Q.red(t,n,r),.78):Q.red(t,n,r)};Xm(t,o,c),Ym(t,o,c),Ym(t,(e,t,n)=>i(t)===a||i(t)===a+3,(e,t,n)=>m(Q.red(e,t,n),.7));for(let e=15;e<=18;e++)for(let n=4+a-1;n<=4+a+3;n++)for(let r=3;r<=7;r++){let i=Math.hypot(e-16.5,n-(4+a+1),r-5);i<2.6&&!t.has(e,n,r)&&t.set(e,n,r,m(Q.red(e,n,r),i>1.6?.82:1))}return be(t,s),t}function ah(){Um(!0);let e=new W(14,6,14);e.box(0,0,0,14,4,14,(e,t,n)=>{let r=e+.5-7,i=n+.5-7-1.4;return!Jm(r,i,4.5,5.6,3)||t>=2&&Jm(r,i,3.1,4.3,3)?null:t===3?i>-1&&!(e+n&1)?2761240:m(Q.bone(e,t,n),1.08):t===0?m(Q.bone(e,t,n),.85):Q.bone(e,t,n)});for(let t=4;t<10;t+=2){let n=-1;for(let r=e.sz-1;r>=0&&n<0;r--)e.has(t,3,r)&&(n=r);n>=0&&e.set(t,4,n,m(Q.bone(t,4,n),1.2))}for(let t of[-1,1])for(let n=3;n<6;n++){let r=t<0?2:11;e.set(r,n,3,Q.bone(r,n,3)),e.set(r,n,4,Q.boneDark(r,n,4))}return e}var oh={ox:20,oy:2,oz:21};function sh(e){Um(e);let t=new W(40,26,42),n=[[-18.4,9.2],[18.4,9.2],[0,-16.8]],r=[[0,1],[1,2],[2,0]],i=(()=>{let[e,t]=n[0],[r,i]=n[1],[a,o]=n[2];return(r-e)*(o-t)-(i-t)*(a-e)>0?1:-1})(),a=(e,t)=>{let a=1e9;for(let[o,s]of r){let[r,c]=n[o],[l,u]=n[s],d=l-r,f=u-c,p=Math.hypot(d,f);a=Math.min(a,((e-r)*-f+(t-c)*d)/p*i)}let o=1e9;for(let[r,i]of n)o=Math.min(o,Math.hypot(e-r,t-i));return{d:a,dv:o}},o=[];for(let e=0;e<t.sz;e++){o[e]=[];for(let n=0;n<t.sx;n++){let{d:t,dv:r}=a(n+.5-20,e+.5-21),i=t;if(i<.2){o[e][n]=null;continue}let s=z(1-i/4.6,0,1),c=6.6*he(1.5,9,r)*s**1.7;o[e][n]={h:2+c,dd:i,dv:r,lift:c}}}let s=(e,t)=>o[t]?.[e]?o[t][e].h:-1;for(let n=0;n<t.sz;n++)for(let r=0;r<t.sx;r++){let i=o[n][r];if(!i)continue;let a=Math.floor(i.h),c=Math.min(...[[1,0],[-1,0],[0,1],[0,-1]].map(([e,t])=>s(r+e,n+t)<0?a:Math.floor(s(r+e,n+t)))),u=Math.max(0,Math.min(a-2,c));for(let o=u;o<=a;o++){let s=o===a,c=i.dd<1.2&&s,u=i.dd<1.6,d=(t,n,r)=>e?Q.hatTrim(t,n,r):(t+r)%4==0?Q.goldDark(t,n,r):Q.gold(t,n,r),f;c&&l(r,o,n,5)<.95||u&&o>=a-1&&i.lift>.4&&l(r,o,n,6)<.12?f=d(r,o,n):(f=Q.hat(r,o,n),i.lift>1.5&&i.dd>1.7&&(f=m(f,1+i.lift/6.6*.14)),s||(f=m(f,.82))),e&&l(r,o,n,7)<.05&&i.dd<2.5||t.set(r,o,n,f)}}for(let e=0;e<t.sz;e++)for(let n=0;n<t.sx;n++){let r=n+.5-20,i=e+.5-21-.6,a=Math.hypot(r/8.4,i/8.4);if(a>1)continue;let o=8.6-a**3.2*2.2;for(let r=2;r<o;r++){let i=r===4||r===5,a=Q.hat(n,r,e);i?a=m(a,.78):r>6&&(a=m(a,1+(r-6)*.025)),r>o-1.4&&l(n,r,e,9)<.3&&(a=m(a,1.15)),t.set(n,r,e,a)}}return t}function ch(e){Um(e);let t=new W(16,24,6);for(let{x0:e,len:n,tilt:r,w:i,seed:a}of[{x0:3,len:15,tilt:.3,w:3,seed:1},{x0:6,len:12,tilt:.05,w:3,seed:2},{x0:8,len:9,tilt:-.28,w:2,seed:3}])for(let o=0;o<n;o++){let s=Math.round(e+o*r),c=+(o>n-5&&l(o,a,0,5)<.4),u=Math.max(1,i-+(o>n-4)-c);for(let e=0;e<u;e++){let n=s+e,r=23-o,i=m(Q.red(n,r,2),o>2?1:.8);t.set(n,r,2,i),t.set(n,r,3,m(i,.9))}}for(let e=2;e<10;e++)for(let n=21;n<24;n++)l(e,n,0,8)<.8&&(t.set(e,n,2,m(Q.red(e,n,2),1.08)),t.set(e,n,3,Q.red(e,n,3)));return t}var lh={ox:6,pivot:30,oz:6,elbow:17,hand:3.5};function uh(e,t,n){Um(e);let r=new W(12,36,12),i=e=>e+.5-6,a=e=>e+.5-6,o=e=>e>=18?4.05:e>=12?3.7+.35*he(12,10,e)+(e<14?.4:0):3.7;if(e||r.box(0,10,0,r.sx,34,r.sz,(n,r,s)=>{if(!Jm(i(n),a(s),o(r),o(r),3.4))return null;let c=t*i(n)+4;if(r+.5>32.4-c*.38-(Math.abs(a(s))>3?.8:0)||e&&r<20&&l(n,r,s,21)<(20-r)*.14-.1+(r<=10?.4:0))return null;let u=1;return r>=16&&r<=19&&(u=.88+(r===17?-.1:0)),!e&&r<=14&&r>=10&&(u*=.96),l(0,r,n+s>>1,22)<.1&&(u*=.88),m(Q.navy(n,r,s),u)}),e){let e=(e,t,n)=>Q.bone(e,t,n),o=(e,t,n,i,a,o)=>{for(let s=i;s<a;s++)for(let i=0;i<r.sz;i++)for(let a=0;a<r.sx;a++)Math.hypot(a+.5-e,i+.5-t)<n&&r.set(a,s,i,o(a,s,i))},s=e=>e%5==0?.82:1;o(6,6,1.75,18,28,(t,n,r)=>m(e(t,n,r),s(n))),r.ellipsoid(6,28.5,6,2.8,2.6,2.6,e),r.ellipsoid(6,17.5,6,2.7,2.4,2.5,(t,n,r)=>m(e(t,n,r),1.06));for(let[t,n]of[[4.8,5.5],[7.2,6.5]])o(t,n,1.05,6,16,(t,n,r)=>n===11?Q.boneDark(t,n,r):e(t,n,r));o(6,6,1.7,14,17,(t,n,r)=>m(e(t,n,r),.9)),r.box(0,18,0,r.sx,34,r.sz,(e,n,r)=>{if(!Jm(i(e),a(r),3.5,3.5,3.2))return null;let o=t*i(e)+4;return n+.5>32.6-o*.4-(Math.abs(a(r))>3?.8:0)||n<(t*i(e)>-.6?21+Math.floor(l(e,0,r,21)*7):28+Math.floor(l(e,1,r,21)*3))?null:m(Q.navy(e,n,r),n>=30?1.08:.94)}),r.box(0,8,0,r.sx,15,r.sz,(e,t,n)=>{let r=3.9+(t<11?.2:0);return!Jm(i(e),a(n),r,r,3)||Jm(i(e),a(n),r-1.4,r-1.4,3)&&t<14||t<8+Math.floor(l(e,0,n,26)*3)?null:t===14?l(e,t,n,27)<.65?Q.gold(e,t,n):Q.leather(e,t,n):t===13?l(e,t,n,28)<.5?m(Q.goldDark(e,t,n),1.05):Q.leatherDark(e,t,n):t<=9?m(Q.leather(e,t,n),.9):m(Q.navy(e,t,n),t<11?.85:1)}),r.box(0,8,0,r.sx,9,r.sz,(e,t,n)=>Jm(i(e),a(n),2.6,2.6,3)?m(Q.boneDark(e,t,n),1.1):null),r.box(3,5,3,9,8,9,(e,t,n)=>Jm(i(e),a(n),2.7,2.5,2.4)?e+n+t&1?Q.bone(e,t,n):Q.boneDark(e,t,n):null),n?(r.box(3,0,3,9,6,9,(e,n,r)=>{let o=i(e),s=a(r);return Math.abs(o)<2.7&&Math.abs(s)<3.4?(r&1)==1&&o*t<.2&&n<5?1840142:n<1?m(Q.bone(e,n,r),.8):(n+r)%3==0?Q.boneDark(e,n,r):Q.bone(e,n,r):null}),r.box(4,5,5,8,7,9,(e,t,n)=>m(Q.bone(e,t,n),1.06))):r.box(3,3,3,9,6,9,(e,t,n)=>e+n+t&1?Q.bone(e,t,n):Q.boneDark(e,t,n))}else{r.box(0,7,0,r.sx,10,r.sz,(e,t,n)=>!Jm(i(e),a(n),4.3,4.3,3)||t===7&&l(e,t,n,23)<.45?null:m(Q.shirt(e,t,n),t===7?.82:1)),r.box(0,6,0,r.sx,8,r.sz,(e,t,n)=>Jm(i(e),a(n),3.2,3.2,3)?m(Q.skin(e,t,n),.9):null),r.box(0,0,0,r.sx,7,r.sz,(e,n,r)=>{let o=i(e),s=a(r);if(!(Math.abs(o)<2.6&&Math.abs(s)<3.2&&!(n>=5&&Math.abs(o)>2.2&&Math.abs(s)>2.6)))return null;let c=n<1?.84:1;return(n===3||n===5)&&s>0&&(c*=.8),o*t>1.6&&(c*=.9),m(Q.skin(e,n,r),c)}),r.box(4,2,2,8,6,3,(e,t,n)=>m(Q.skin(e,t,n),t===4?.75:.92));for(let e of[4,6,8])for(let n of[t>0?3:8])for(let t=1;t<6;t++)r.has(n,t,e)&&r.set(n,t,e,m(Q.skin(n,t,e),e===6?.72:.8));r.box(5,5,6,7,7,9,(e,t,n)=>m(Q.skin(e,t,n),1.06))}let s=r.data.slice();return e||Ym(r,(e,t,n)=>t>=11&&t<=13&&Math.hypot(i(e),a(n))<5.4,(e,t,n)=>{let r=Math.atan2(a(n),i(e)),o=Math.floor((r+Math.PI)/(Math.PI*2)*9);return t===12&&o%3==1?Q.leatherDark(e,t,n):o%3==1?Q.goldDark(e,t,n):Q.gold(e,t,n)}),e||Ym(r,(e,t,n)=>t>=24&&t<=25&&Math.hypot(i(e),a(n))<4.6,(e,t,n)=>t===24?m(Q.navy(e,t,n),.75):null),be(r,s),r}function dh(e){Um(!0);let t=new W(12,8,12);for(let n of[2,4,6,8]){let r=n===2||n===8?4:5;for(let i=0;i<r;i++){let r=5+(i>2?(e>0?1:-1)*0:0)+0;for(let e of[0,1])t.set(r+e-0,7-i,n,i===2||i===4?Q.boneDark(r,i,n):Q.bone(r+e,7-i,n))}}return t.box(4,6,3,8,8,8,(e,t,n)=>e+t+n&1?Q.bone(e,t,n):Q.boneDark(e,t,n)),t}var fh={ox:7.5,pivot:43,oz:8,knee:22};function ph(e,t){Um(e);let n=new W(15,48,22),r=7.5,i=e=>e+.5-r,a=e=>e+.5-8;if(n.box(0,0,0,n.sx,48,n.sz,(n,r,o)=>{let s=i(n),c=a(o);if(r<17){let t=r>=12,i=e?t?5.1:r>=6?4.45:5:t?5.35:r>=6?4.95:5,a=r>=6&&Jm(s,c,i,i,3.2),u=!1;if(r<6){let e=o+.5,t=5.6-Math.max(0,e-12)*.6,n=5.1-Math.max(0,e-14)*.5;u=r+.5<t&&e>2.5&&e<17-(r<1?0:.6*(r<2))&&Math.abs(s)<n&&(e<3.6?Math.abs(s)<4.4:!0)}if(!a&&!u)return null;let d=Q.boot(n,r,o);return r===0?d=m(Q.leatherDark(n,r,o),.8):r===1?d=m(Q.leatherDark(n,r,o),1.1):t?(d=m(Q.boot(n,r,o),1.12),r===12&&(d=m(d,.6)),r===16&&(d=m(d,1.2)),r===13&&(n+o)%4==0&&(d=m(d,.78))):r>=6&&(r===8||r===10)&&l(n,r,o,31)<.7&&(d=m(d,.74)),u&&o>12&&r>=2&&r<5&&Math.abs(s)<3.4&&(d=m(d,1.12)),u&&o===13&&r>=2&&(d=m(d,.7)),d}let u=r>=19&&r<=24,d=r<20?5.3:4.5+(u?.25:0);if(!Jm(s,c,d,d,3))return null;if(e){if(r<27+Math.floor(l(n,0,o,33)*5)-(l(n,1,o>>1,35)<.2?6:0))return null;if(Jm(s,c,2.5,2.5,2.4))return qm}let f=1;u&&c>0&&(f*=r===22||r===21?.82:1),r>=17&&r<=20&&(f*=r===17?.75:.92),l(0,r,n+o>>1,34)<.09&&(f*=.85);let p=m(Q.pants(n,r,o),f);return t===1&&r>=21&&r<=25&&c>1&&s<0&&s>-3.6&&(p=m(Hm.pants[3],1.25+l(n,r,o,5)*.1)),p}),e){let e=(e,t,n)=>Q.bone(e,t,n);for(let t=17;t<46;t++){let r=t>40?2.1:t>23&&t<33?1.55:t>23?1.7:1.5;for(let o=0;o<n.sz;o++)for(let s=0;s<n.sx;s++)Math.hypot(i(s),a(o))<r&&t>24&&n.set(s,t,o,e(s,t,o))}for(let t=17;t<=27;t++){let r=t>=22?2.4:2.1;for(let o=0;o<n.sz;o++)for(let s=0;s<n.sx;s++)Math.hypot(i(s),a(o))<r&&n.set(s,t,o,t===22||t===19?Q.boneDark(s,t,o):e(s,t,o))}n.ellipsoid(r,22.5,10.2,1.7,1.7,1,(t,n,r)=>m(e(t,n,r),1.08)),n.ellipsoid(10,19,7.6,.8,3,.8,e);for(let e=0;e<3;e++){let o=28+e*5+l(e,t,0,9)*2,s=l(e,t,1,9)*Math.PI*2,c=r+Math.cos(s)*4.5,u=8+Math.sin(s)*4.5;for(let e=0;e<n.sz;e++)for(let t=24;t<46;t++)for(let r=0;r<n.sx;r++)Math.hypot(r+.5-c,t+.5-o,e+.5-u)<2.7&&Math.hypot(i(r),a(e))>1.9&&n.clear(r,t,e)}}return n}var mh={ox:15,oy:24,oz:11};function hh(e){Um(e);let t=new W(30,25,24);for(let n=23;n>=3;n--){let r=23-n,i=11.9+r*.17,a=7.2+r*.15;for(let o=0;o<t.sz;o++)for(let s=0;s<t.sx;s++){let c=s+.5-15,u=o+.5-12;if(!Jm(c,u,i,a,3.4)||Jm(c,u,i-1.7,a-1.7,3.4))continue;let d=3.4+r*.4;if(u>0&&Math.abs(c)<d||u<0&&Math.abs(c)<.9&&r>4)continue;let f=4+Math.floor(l(s,0,o,41)*(e?5:2))+(e&&l(s,1,o,42)<.3?2:0);if(n<f||e&&l(s,n,o,43)<.06)continue;let p=Jm(c,u,i-2.4,a-2.4,3.4)&&r>1,h=p?Q.navyDark(s,n,o):Q.navy(s,n,o),g=u>0&&Math.abs(c)-d<1.4,_=u<0&&Math.abs(c)<2.1&&r>4;e&&n<f+2&&!g?h=l(s,n,o,44)<.4?Q.goldDark(s,n,o):m(Q.navyDark(s,n,o),1.2):n<f+2||g||_?h=l(s,n,o,44)<.88?Q.gold(s,n,o):Q.goldDark(s,n,o):(r===0||r===1)&&(h=m(Q.navy(s,n,o),.7)),!p&&r>2&&l(s>>1,0,o>>1,45)<.12&&(h=m(h,.88)),t.set(s,n,o,h)}}return t.box(0,0,0,t.sx,t.sy,t.sz,(t,n,r)=>{let i=t+.5-15;if(n>23||n<23-(e?8:12)+Math.floor(l(t,0,0,5)*3)||i<2.6||i>6.1||r<16||r>18||e&&l(t,n,r,6)<.18)return null;let a=n<16?.82:1;return m(e?v(Q.red(t,n,r),2755084,.35):Q.red(t,n,r),a*(r===18?1:.88))}),e&&Qm(t,{patch:.36,bone:0,nibble:.16,seed:3}),t}function gh(e,t){return eh(e,15,t)}var _h={ox:8,oy:14.5,oz:10.5};function vh(e){Um(e);let t=new W(16,72,26),n=e=>10.5-9.5*e**1.7;for(let r=0;r<44;r++){let i=r/43,a=22+r,o=(4+2.8*he(.1,.72,i))*(i>.88?1-(i-.88)/.12*.85:1),s=n(i)-o*.45,c=n(i)+o*.55;for(let n=Math.floor(s);n<=Math.ceil(c);n++){let i=(n+.5-s)/Math.max(.01,c-s);if(i<-.05||i>1.05)continue;let o=i>.78?1:2;for(let s=0;s<o;s++){let o=7+s,c=Q.steel(o,a,n),u=1;if(i<.22?u=.8:i>.8?u=1.2:Math.abs(i-.45)<.1&&(u=.88),s===1&&(u*=.86),r<3&&(u*=.82),c=m(c,u),e){let e=l(o>>2,a>>2,n>>1,78);e<.2&&l(o,a,n,77)<.55?c=m(e<.07?Q.blood(o,a,n):Q.rust(o,a,n),u):i>.85&&l(o,a,n,80)<.18&&(c=m(Q.rust(o,a,n),u))}t.set(o,a,n,c)}}}t.box(7,10,9,9,22,12,(e,t,n)=>t%3==0?m(Q.leather(e,t,n),1.25):Q.leatherDark(e,t,n)),t.box(6,7,9,10,10,13,(e,t,n)=>t===7&&(e===6||e===9)?null:Q.gold(e,t,n)),t.box(7,5,10,9,7,12,Q.goldDark),t.box(6,20,5,10,22,16,(e,t,n)=>n<6&&t===20?null:Q.gold(e,t,n)),t.box(7,22,8,9,23,14,Q.goldDark),t.box(6,21,4,10,24,5,Q.gold),t.box(6,19,15,10,21,18,Q.gold);for(let e=0;e<=1.001;e+=.04){let n=19-12*e,r=16+2.4*Math.sin(Math.PI*e);for(let i=7;i<9;i++){let a=Math.round(e*14)%2==0;t.set(i,Math.round(n),Math.round(r),a?Q.gold(i,n,r):Q.goldDark(i,n,r)),t.set(i,Math.round(n),Math.round(r)+1,a?Q.goldDark(i,n,r):Q.gold(i,n,r))}}return t}var yh=at({vertexColors:!0}),bh=.78;function xh(e,t){let n=Math.max(1,Math.ceil(e.sx*t)),r=Math.max(1,Math.ceil(e.sy*t)),i=Math.max(1,Math.ceil(e.sz*t)),a=new W(n,r,i),o=1/t,s=o*o*o,c=e=>{let t=e*o,n=(e+1)*o,r=Math.floor(t),i=Math.min(Math.ceil(n),1e9),a=[];for(let e=r;e<i;e++)a.push([e,Math.max(0,Math.min(n,e+1)-Math.max(t,e))]);return a};for(let t=0;t<i;t++){let i=c(t);for(let o=0;o<r;o++){let l=c(o);for(let u=0;u<n;u++){let d=c(u),f=0,p=0,m=0,h=0,g=0;for(let[t,n]of i)if(!(t>=e.sz)){for(let[r,i]of l)if(!(r>=e.sy))for(let[a,o]of d){if(a>=e.sx)continue;let s=e.data[a+e.sx*(r+e.sy*t)];if(!s)continue;let c=o*i*n;f+=c,s&33554432?c>g&&(g=c,h=s):c>m&&(m=c,p=s)}}h&&g>s*.2?a.data[u+n*(o+r*t)]=h:p&&f>s*.45&&(a.data[u+n*(o+r*t)]=p)}}}return a}var Sh=(e,t,n,r,i,a=bh)=>a===1?R(e,t,n,r,i,Im):R(xh(e,a),t*a,n*a,r*a,i,Im/a),Ch=new Map;function wh(e,t){let n=Ch.get(e);return n||(n=t(yh),Ch.set(e,n)),n.clone(!0)}var Th=5.3,Eh=new Map;function Dh(e,t,n){let r=new W(e.sx,e.sy,e.sz);for(let i=0;i<e.sz;i++)for(let a=Math.max(0,t);a<Math.min(e.sy,n);a++)for(let t=0;t<e.sx;t++)r.data[r.idx(t,a,i)]=e.data[e.idx(t,a,i)];return r}function Oh(e,t,n,r,i,a){let o=Sh(Dh(e,a,e.sy),t,n,r,i),s=Sh(Dh(e,0,a+1),t,a,r,i);return s.scale.set(.975,1,.975),{upper:o,lower:s}}function kh(e,t,n,r,i,a){Eh.has(e)||Eh.set(e,Oh(t(),n,r,i,yh,a));let o=Eh.get(e);return{upper:o.upper.clone(!0),lower:o.lower.clone(!0)}}function Ah(e){let t=e?`u`:`l`,n=at({vertexColors:!0,emissive:new N(0)}),r=new V,i=new V;i.position.y=43*Im,r.add(i);let a=new V;i.add(a),a.add(wh(`torso`+t,()=>Sh(nh(e),th.ox,th.oy,th.oz,yh)));let o=new V;o.position.set(0,26.6*Im,.2*Im),o.add(wh(`head`+t,()=>Sh(ih(e),rh.ox,rh.oy,rh.oz,yh,1))),a.add(o);let s=null;e&&(s=new V,s.position.set(0,1.5*Im,-3.4*Im),s.add(wh(`jaw`,()=>Sh(ah(),7,3.2,3.6,yh,1))),o.add(s));let c=new V;c.position.set(0,(e?14.5:12.5)*Im,.2*Im),c.add(wh(`hat`+t,()=>Sh(sh(e),oh.ox,oh.oy,oh.oz,yh,1))),o.add(c);let l=new V;l.position.set(5.9*Im,(e?14.6:12.6)*Im,-6.4*Im),l.rotation.set(.1,.5,-.12),l.add(wh(`knot`+t,()=>Sh(ch(e),6,23,2.5,yh))),o.add(l);let u=[];for(let n of[-1,1]){let r=n===1,{upper:i,lower:o}=kh(`arm${t}${n}${r?`g`:``}`,()=>uh(e,n,r),lh.ox,lh.pivot,lh.oz,lh.elbow),s=new V;s.position.set(n*15*Im,22*Im,0);let c=new V;c.position.y=-(lh.pivot-lh.elbow)*Im,c.add(o),s.add(i,c);let l=new V;l.position.set(0,-(lh.elbow-lh.hand)*Im,0),c.add(l);let d=null;e&&!r&&(d=new V,d.position.set(0,-(lh.elbow-3.4)*Im,0),d.add(wh(`fingers`+n,()=>Sh(dh(n),6,4,5.5,yh))),c.add(d)),a.add(s),u.push({shoulder:s,elbow:c,hand:l,fingers:d})}let[d,f]=u,p=new V;p.add(wh(`sword`+t,()=>Sh(vh(e),_h.ox,_h.oy,_h.oz,yh))),p.rotation.x=Math.PI/2,f.hand.add(p);let m=[];for(let n of[-1,1]){let{upper:r,lower:a}=kh(`leg${t}${n}`,()=>ph(e,+(n>0)),fh.ox,fh.pivot,fh.oz,fh.knee),o=new V;o.position.set(n*Th*Im,0,0);let s=new V;s.position.y=-(fh.pivot-fh.knee)*Im,s.add(a),o.add(r,s),i.add(o),m.push({thigh:o,knee:s})}let[h,g]=m,_=[];for(let n of[-1,1]){let r=new V;r.position.set(0,1*Im,0),r.add(wh(`cloth${t}${n}`,()=>Sh(gh(hh(e),n),mh.ox,mh.oy,mh.oz,yh))),i.add(r),_.push(r)}return r.traverse(e=>{e.isMesh&&e.material===yh&&(e.material=n)}),r.scale.setScalar(1),{root:r,mat:n,parts:{hip:i,body:a,head:o,jaw:s,hat:c,knot:l,armL:d.shoulder,armR:f.shoulder,elbowL:d.elbow,elbowR:f.elbow,handL:d.hand,handR:f.hand,fingersL:d.fingers,sword:p,legL:h.thigh,legR:g.thigh,kneeL:h.knee,kneeR:g.knee,clothL:_[0],clothR:_[1]}}}var jh=()=>Ah(!1),Mh=()=>Ah(!0),Nh=e({DEFS:()=>Rh,FX:()=>zh,TYPES:()=>Lh,animate:()=>Dg,busy:()=>Kh,dead:()=>jg,ghostBlade:()=>og,holdsWarn:()=>qh,think:()=>mg}),Ph=Math.PI*2,Fh=[7012250,12124112,3856506],Ih=[14274484,15129794,10523764,7012250],Lh=new Set([`pirate`,`cursedpirate`]),Rh={pirate:{name:`Pirate`,hp:70,radius:.6,speed:3,dmg:4,gold:[20,40],aggro:14,build:jh},cursedpirate:{name:`Cursed Pirate`,hp:110,radius:.6,speed:3.1,dmg:6,gold:[45,70],aggro:15,build:Mh}},zh={pirate:{spark:[16773824,16757575,16777215],burst:[13211258,16734790,16777215],death:[2768760,13938768,13211258,16777215],tele:16765503,accel:10,accelFn:e=>e.state===`dash`?30:e.state.startsWith(`strike`)?16:10,knock:2.2,stun:.3,plateY:2.1,deathDur:1.7,heavy:!1,rage:!1},cursedpirate:{spark:[15137232,7012250,16777215],burst:[14208432,3866490,16777215],death:[14274484,7012250,12124112,3856506],tele:3866490,accel:9,accelFn:e=>e.state.startsWith(`strike`)?12:9,knock:3.4,stun:.2,plateY:2.1,deathDur:2.6,heavy:!0,rage:!0,rageText:`The Curse Stirs!`,noLift:!0,slowmo:!0}},Bh=new Set([`windO`,`windS`,`windL`]),Vh=new Set([`strikeO`,`strikeS`,`dash`,`recover`]),Hh=new Set([`windC`,`windG`]),Uh=new Set([`strikeC1`,`linkC1`,`strikeC2`,`linkC2`,`strikeC3`,`strikeG`,`recover`]),Wh=e=>e.enraged||e.puppet&&e.hp<e.maxHp*.5?1.3:1,Gh=e=>e.type===`cursedpirate`;function Kh(e){return Gh(e)?Uh.has(e.state)||Wh(e)>1&&Hh.has(e.state):Vh.has(e.state)}var qh=e=>Bh.has(e.state)||Hh.has(e.state);function Jh(e,t){let n=(t-e)%Ph;return n>Math.PI&&(n-=Ph),n<-Math.PI&&(n+=Ph),n}var Yh=(e,t,n,r)=>{e.yaw+=z(Jh(e.yaw,t),-n*r,n*r)};function Xh(e){let t=zm;return{windO:t.overhead.wind,strikeO:t.overhead.strike,windS:t.side.wind,strikeS:t.side.strike,windL:t.lunge.wind,dash:t.lunge.dash}[e]}function Zh(e,t){let n=Bm,r=Wh(e),i={windC:n.combo.wind,strikeC1:n.combo.strike1,linkC1:n.combo.link,strikeC2:n.combo.strike2,linkC2:n.combo.link*.8,strikeC3:n.combo.strike2*1.1,windG:n.smash.wind,strikeG:n.smash.strike}[t]||.5;return Hh.has(t)||t.startsWith(`link`)?i/r:i}function Qh(e,t,n,r){let i=t.pos.x-n,a=t.pos.z-r,o=Math.sin(e.yaw),s=Math.cos(e.yaw);return{along:i*o+a*s,perp:Math.abs(i*s-a*o),dist:Math.hypot(i,a),ang:Math.abs(Jh(e.yaw,Math.atan2(i,a)))}}var $h=(e,t)=>!t.dead&&t.pos.y<e.y+2.6;function eg(e,t,n,r,i,a,o){if(!$h(e,t))return!1;let s=Qh(e,t,e.x,e.z);return s.along<-.3||s.along>n||s.perp>r?!1:ng(e,t,i,a,o)}function tg(e,t,n,r,i,a,o){if(!$h(e,t))return!1;let s=Qh(e,t,e.x,e.z);return s.dist>n||s.ang>r?!1:ng(e,t,i,a,o)}function ng(e,t,n,r,i){return t.hurt(n,e.x,e.z,r)?(e.game.fx.burst(t.pos.x,t.pos.y+1.1,t.pos.z,i,10,3.4,.09,.4),!0):!1}function rg(e){e.orbitT=1.2+Math.random()*2.2,Math.random()<.5&&(e.orbitDir=-(e.orbitDir||1)),e.orbitDir=e.orbitDir||1}function ig(e,t,n){if(e.pauseT=(e.pauseT??Math.random()*2)-t,e.pauseT>0)return[0,0];if(!e.target){let t=Math.random()*Ph,n=2+Math.random()*5;e.target={x:e.home.x+Math.cos(t)*n,z:e.home.z+Math.sin(t)*n}}let r=e.target.x-e.x,i=e.target.z-e.z,a=Math.hypot(r,i);return e.patrolT=(e.patrolT||0)+t,a>.7&&e.patrolT<6?(Yh(e,Math.atan2(r,i),3,t),[r/a*n,i/a*n]):(e.pauseT=1.6+Math.random()*3,e.patrolT=0,e.target=null,[0,0])}var ag=new ge;function og(e,t=5111690,n=.28,r=.55){let i=e.model.parts.sword,o=e.game;if(!i||!o?.scene)return;i.updateWorldMatrix(!0,!0);let s=[];i.traverse(e=>e.isMesh&&s.push(e));let c=new V,l=new a({color:t,transparent:!0,opacity:r,depthWrite:!1,blending:2});for(let e of s){let t=new yt(e.geometry,l);t.matrixAutoUpdate=!1,ag.copy(e.matrixWorld),t.matrix.copy(ag),t.frustumCulled=!1,c.add(t)}o.scene.add(c);let u=performance.now(),d=()=>{let e=(performance.now()-u)/1e3/n;e>=1||!c.parent?(o.scene.remove(c),l.dispose()):(l.opacity=r*(1-e)**1.4,requestAnimationFrame(d))};requestAnimationFrame(d)}function sg(e,t,n,r){let i=e.game;e.atk=t,e.lastAtk=t,e.t=0,e.hitDone=!1,t===`overhead`?(e.state=`windO`,e.warn(`line`,1.9,3.1,zm.overhead.wind),i.audio.tone(130,.35,`sawtooth`,.08,-40)):t===`side`?(e.state=`windS`,e.warn(`line`,3.4,2.9,zm.side.wind),i.audio.tone(200,.25,`sawtooth`,.07,-80)):(e.state=`windL`,e.warn(`line`,1.4,Math.min(8,Math.max(5.5,r+1.5)),zm.lunge.wind),i.audio.tone(90,.45,`triangle`,.09,120))}function cg(e,t,n){let{g:r,P:i,dx:a,dz:o,dist:s,sees:c,toP:l}=n,u=e.def.speed,d=0,f=0,p=e.state,m=Math.hypot(e.x-e.home.x,e.z-e.home.z),h=e._hpSeen!==void 0&&e.hp<e._hpSeen;if(e._hpSeen=e.hp,Bh.has(p)&&h)return e.clearWarn(),e.state=`stagger`,e.t=0,e.cd=.5,r.hud.floatText(...r.screenOf(e.x,e.y+2.2,e.z),`Staggered`,`gold`),[0,0];if(p===`idle`||p===`wander`)e.state=`idle`,c&&m<40?(e.state=`chase`,e.cd=Math.min(e.cd,.7),rg(e),r.audio.tone(150,.3,`sawtooth`,.07,40)):[d,f]=ig(e,t,1.15);else if(p===`chase`){if(!c&&s>e.def.aggro*1.5||m>40)return e.state=`idle`,e.target={x:e.home.x,z:e.home.z},e.pauseT=0,[0,0];Yh(e,l,7,t),e.orbitT=(e.orbitT??0)-t,e.orbitT<=0&&rg(e);let n=a/s,r=o/s;if(s>3){let e=u*(s>9?1.15:1);d=n*e,f=r*e}else{let t=s<1.9?-.5:s<2.3?0:.25;d=(n*t-r*e.orbitDir*.55)*u,f=(r*t+n*e.orbitDir*.55)*u}if(e.cd<=0&&!i.dead){let t=Math.random();s<3.2?sg(e,e.lastAtk===`overhead`&&t<.6?`side`:t<.58?`overhead`:`side`,i,s):s>4&&s<9&&t<.7?sg(e,`lunge`,i,s):e.cd=.25}}else if(Bh.has(p)){let n=p===`windL`?9:p===`windS`?7:5;e.t<Xh(p)-.12&&Yh(e,l,n,t),p===`windO`&&s>2.6&&(d=a/s*u*.45,f=o/s*u*.45),e.t>Xh(p)&&(e.clearWarn(),e.t=0,e.hitDone=!1,p===`windL`?(e.state=`dash`,r.audio.tone(70,.3,`square`,.1,100),r.fx.ring(e.x,e.y+.2,e.z,14272928,8,2.4,.08,.35)):(e.state=p===`windO`?`strikeO`:`strikeS`,e.kick=1,lg(e,i)))}else if(p===`strikeO`||p===`strikeS`)e.t>Xh(p)&&(e.state=`recover`,e.t=0);else if(p===`dash`)d=Math.sin(e.yaw)*13,f=Math.cos(e.yaw)*13,Math.random()<t*40&&r.fx.dust(e.x,e.y,e.z,1,1.2,14272928),!e.hitDone&&s<e.radius+1.45&&$h(e,i)&&(e.hitDone=!0,!i.dead&&i.hurt(e.def.dmg+1,e.x,e.z,9)&&(r.fx.burst(i.pos.x,i.pos.y+1.1,i.pos.z,[16773824,16734790,16777215],10,3.4,.09,.4),r.shake(.15)),r.vfx.hit(e.x+Math.sin(e.yaw)*1.3,e.y+1,e.z+Math.cos(e.yaw)*1.3,Math.sin(e.yaw),Math.cos(e.yaw),16769696,.8)),(e.t>Xh(`dash`)||e.hitDone)&&(e.state=`recover`,e.t=0);else if(p===`recover`){let t=e.atk===`lunge`;e.t>(t?.75:e.atk===`side`?.4:.5)&&(e.state=`chase`,e.cd=.55+Math.random()*.7,rg(e))}else p===`stagger`?(d=-Math.sin(e.yaw)*.6,f=-Math.cos(e.yaw)*.6,e.t>.42&&(e.state=`chase`,e.cd=.35+Math.random()*.3)):e.state=`chase`;return[d,f]}function lg(e,t){let n=e.game,r=Math.sin(e.yaw),i=Math.cos(e.yaw),a=e.def.dmg,o=[16773824,16757575,16777215];e.atk===`overhead`?(n.vfx.slashArc(e.x+r*.3,e.y+1.5,e.z+i*.3,e.yaw,{radius:2.3,thick:1.15,sweep:2.4,color:16769696,hot:16777215,tilt:1.45,life:.26,sweepT:.12,tail:.9}),n.fx.dust(e.x+r*2,e.y,e.z+i*2,4,1.4,14272928),n.audio.tone(170,.2,`square`,.1,-110),eg(e,t,2.9,.95,a+1,7,o)):(n.vfx.slashArc(e.x+r*.2,e.y+1.1,e.z+i*.2,e.yaw,{radius:2.5,thick:1,sweep:2.5,color:15134975,hot:16777215,tilt:.12,flip:-1,life:.22,sweepT:.1,tail:.9}),n.audio.tone(240,.16,`square`,.09,-140),tg(e,t,3,1.15,a,6,o))}function ug(e,t){let n=e.game;e.atk=t,e.lastAtk=t,e.t=0,e.hitDone=!1;let r=t===`combo`?Zh(e,`windC`):Zh(e,`windG`);t===`combo`?(e.state=`windC`,e.warn(`line`,2.5,3.5,r),n.audio.tone(80,.5,`sawtooth`,.09,-20)):(e.state=`windG`,e.warn(`circle`,3,0,r),n.audio.tone(60,.8,`triangle`,.1,80))}function dg(e,t,n){let r=e.game,i=Math.sin(e.yaw),a=Math.cos(e.yaw),o=e.def.dmg,s=[7012250,14274484,16777215],c=n===1?.75:n===2?-.75:1.4;r.vfx.slashArc(e.x+i*.3,e.y+1.4,e.z+a*.3,e.yaw,{radius:2.7,thick:1.4,sweep:2.8,color:3866490,hot:14221280,tilt:c,flip:n===2?-1:1,life:.32,sweepT:.14,tail:.95}),r.fx.burst(e.x+i*2,e.y+1,e.z+a*2,Fh,8,3,.1,.5,2,1.5),r.audio.tone(n===3?90:140,.25,`sawtooth`,.1,-100),og(e,5111690,.3,.6),n===3?(r.shake(.2),eg(e,t,3.2,1.2,o+2,10,s)):tg(e,t,3.2,1.2,o+ +(n===2),n===2?8:6,s)}function fg(e,t){let n=e.game,r=Math.sin(e.yaw),i=Math.cos(e.yaw),a=e.x+r*1.6,o=e.z+i*1.6,s=n.world.heightAt(a,o);n.fx.shockwave(a,s,o,10485696,3.2),n.fx.ring(a,s+.25,o,3866490,24,5.4,.12,.55),n.fx.burst(a,s+.5,o,[7012250,14274484,16777215],18,4.4,.12,.8,7,3),n.vfx.glow(a,s+.6,o,3866490,4.5,.4,{grow:.8}),n.vfx.slashArc(e.x+r*.3,e.y+1.5,e.z+i*.3,e.yaw,{radius:2.6,thick:1.5,sweep:2.4,color:3866490,hot:14221280,tilt:1.45,life:.34,sweepT:.14,tail:.95}),og(e,5111690,.36,.65),n.shake(.35),n.punch?.(.25),n.audio.tone(55,.5,`square`,.16,-20),!t.dead&&t.pos.y<e.y+2.6&&Math.hypot(t.pos.x-e.x,t.pos.z-e.z)<3&&t.hurt(e.def.dmg+3,e.x,e.z,11)&&n.fx.burst(t.pos.x,t.pos.y+1.1,t.pos.z,[7012250,14274484,16777215],12,3.6,.1,.5)}function pg(e,t,n){let{g:r,P:i,dx:a,dz:o,dist:s,sees:c,toP:l}=n,u=Wh(e),d=e.def.speed*(u>1?1.2:1),f=0,p=0,m=e.state,h=Math.hypot(e.x-e.home.x,e.z-e.home.z),g=e._hpSeen!==void 0&&e.hp<e._hpSeen;if(e._hpSeen=e.hp,Hh.has(m)&&u<=1&&g)return e.clearWarn(),e.state=`stagger`,e.t=0,e.cd=.45,[0,0];if(u>1&&Math.random()<t*4&&r.fx.emit(e.x+(Math.random()-.5)*.7,e.y+.2+Math.random()*1.6,e.z+(Math.random()-.5)*.7,0,1+Math.random(),0,Fh[Math.random()*3|0],.1,.9,-.4),m===`idle`||m===`wander`)e.state=`idle`,c&&h<46?(e.state=`chase`,e.cd=Math.min(e.cd,.8),r.audio.tone(70,.5,`sawtooth`,.08,-20),r.fx.burst(e.x,e.y+1.6,e.z,Fh,6,1.8,.09,.6,-.5,.5)):[f,p]=ig(e,t,.8);else if(m===`chase`){if(!c&&s>e.def.aggro*1.6||h>50)return e.state=`idle`,e.target={x:e.home.x,z:e.home.z},e.pauseT=0,[0,0];Yh(e,l,4.8*u,t),s>2.2&&(f=a/s*d,p=o/s*d),e.cd<=0&&!i.dead&&s<3.6&&ug(e,Math.random()<(u>1?.38:.28)&&e.lastAtk!==`smash`?`smash`:`combo`)}else Hh.has(m)?(Yh(e,l,m===`windG`?3.5:6,t),s>2.4&&(f=a/s*d*.35,p=o/s*d*.35),e.t>Zh(e,m)&&(e.clearWarn(),e.t=0,e.kick=1,m===`windC`?(e.state=`strikeC1`,dg(e,i,1)):(e.state=`strikeG`,fg(e,i)))):m===`strikeC1`||m===`strikeC2`||m===`strikeC3`||m===`strikeG`?(Yh(e,l,2.2,t),e.t>Zh(e,m)&&(e.t=0,e.state=m===`strikeC1`?`linkC1`:m===`strikeC2`&&u>1?`linkC2`:`recover`)):m===`linkC1`||m===`linkC2`?(Yh(e,l,7*u,t),f=a/Math.max(s,.1)*d*.7,p=o/Math.max(s,.1)*d*.7,s<1.4&&(f=0,p=0),e.t>Zh(e,m)&&(e.t=0,e.kick=1,e.state=m===`linkC1`?`strikeC2`:`strikeC3`,dg(e,i,m===`linkC1`?2:3))):m===`recover`?e.t>(e.atk===`smash`?.9:.75)/u&&(e.state=`chase`,e.cd=(.45+Math.random()*.45)/u):m===`stagger`?(f=-Math.sin(e.yaw)*.5,p=-Math.cos(e.yaw)*.5,e.t>.35&&(e.state=`chase`,e.cd=.3)):e.state=`chase`;return[f,p]}function mg(e,t,n){return Gh(e)?pg(e,t,n):cg(e,t,n)}var hg=e=>e*e*(3-2*e),gg=e=>e*e,_g=e=>1-(1-e)*(1-e),vg={lean:.05,twist:0,roll:0,rx:-.2,rz:.04,re:-.6,rb:.3,rr:0,lx:.05,lz:.08,le:-.25,ll:0,lr:0,kl:0,kr:0,crouch:0,hx:0,hy:0},yg=Object.keys(vg),bg=e=>({...vg,...e}),xg=(e,t,n)=>{let r={};for(let i of yg)r[i]=e[i]+(t[i]-e[i])*n;return r},Sg={O0:bg({lean:-.24,twist:-.18,rx:-2.85,rz:.1,re:-.55,rb:-2.55,lx:-.7,lz:.55,le:-.6,ll:.35,lr:-.12,kl:.25,crouch:.1,hx:-.15}),O1:bg({lean:.5,twist:.2,rx:-.55,rz:.12,re:-.2,rb:.6,lx:.5,lz:.5,le:-.3,ll:.5,lr:-.55,kr:.5,crouch:.22,hx:.2}),S0:bg({lean:.14,twist:1,rx:-.85,rz:1,re:-.6,rb:-.25,rr:-1.45,lx:-.7,lz:.2,le:-.7,ll:.3,lr:-.25,kl:.2,crouch:.12}),S1:bg({lean:.25,twist:-1,rx:-1.25,rz:.55,re:-.2,rb:-.1,rr:-1.45,lx:.5,lz:.9,le:-.2,ll:-.3,lr:.35,kr:.3,crouch:.12}),L0:bg({lean:-.08,twist:.45,rx:.25,rz:.04,re:-1.85,rb:0,lx:-.9,lz:.2,le:-.9,ll:.55,lr:-.9,kl:.5,kr:1.1,crouch:.28,hx:-.1}),L1:bg({lean:.55,twist:-.35,rx:-1.5,rz:.05,re:-.08,rb:0,lx:.55,lz:.9,le:-.3,ll:.9,lr:-1,kl:.4,kr:.9,crouch:.25,hx:.2})},Cg={W:bg({lean:-.2,twist:.7,rx:-2.7,rz:.4,re:-.6,rb:-2.3,rr:.3,lx:-.6,lz:.6,le:-.5,ll:.3,lr:-.1,crouch:.1,hx:-.2}),A:bg({lean:.45,twist:-.75,rx:-.75,rz:-.2,re:-.3,rb:.5,rr:.1,lx:.5,lz:.5,le:-.3,ll:.45,lr:-.5,kr:.4,crouch:.22,hx:.15}),B:bg({lean:.25,twist:-.8,rx:-1.1,rz:-.1,re:-.5,rb:.2,rr:3.1,lx:.4,lz:.5,le:-.4,ll:.3,lr:-.4,kr:.3,crouch:.15}),C:bg({lean:.2,twist:.85,rx:-1,rz:.9,re:-.4,rb:-.3,rr:3.1,lx:-.5,lz:.4,le:-.5,ll:-.3,lr:.4,kl:.4,crouch:.15}),G0:bg({lean:-.35,twist:0,rx:-2.9,rz:.1,re:-.45,rb:-2.7,lx:-2.8,lz:-.05,le:-.5,ll:.3,lr:-.2,kl:.25,crouch:.12,hx:-.3}),G1:bg({lean:.62,twist:.1,rx:-.75,rz:.1,re:-.2,rb:.65,lx:-.9,lz:.2,le:-.6,ll:.55,lr:-.6,kr:.6,crouch:.28,hx:.25})};function wg(e,t,n){switch(t){case`windO`:return xg(vg,Sg.O0,hg(n));case`strikeO`:return xg(Sg.O0,Sg.O1,gg(z(n*1.5,0,1)));case`windS`:return xg(vg,Sg.S0,hg(n));case`strikeS`:return xg(Sg.S0,Sg.S1,gg(z(n*1.4,0,1)));case`windL`:return xg(vg,Sg.L0,hg(n));case`dash`:return xg(Sg.L0,Sg.L1,_g(z(n*3,0,1)));case`recover`:return xg(e.atk===`overhead`?Sg.O1:e.atk===`side`?Sg.S1:Sg.L1,vg,hg(z((n-.15)/.85,0,1)));case`stagger`:return bg({lean:-.3,twist:-.3,rx:-.6,rz:.7,re:-.4,rb:.5,lx:.2,lz:1,le:-.2,ll:.25,lr:-.2,kl:.3,crouch:.1,hx:-.4});default:return null}}function Tg(e,t,n){let r=Cg;switch(t){case`windC`:return xg(vg,r.W,hg(n));case`strikeC1`:return xg(r.W,r.A,gg(z(n*1.5,0,1)));case`linkC1`:return xg(r.A,r.B,hg(n));case`strikeC2`:return xg(r.B,r.C,gg(z(n*1.5,0,1)));case`linkC2`:return xg(r.C,r.W,hg(n));case`strikeC3`:return xg(r.W,r.A,gg(z(n*1.5,0,1)));case`windG`:return xg(vg,r.G0,hg(n));case`strikeG`:return xg(r.G0,r.G1,gg(z(n*1.6,0,1)));case`recover`:return xg(e.atk===`smash`?r.G1:e.lastStrike===`strikeC3`||e.lastStrike===`strikeC2`?r.C:r.A,vg,hg(z((n-.15)/.85,0,1)));case`stagger`:return bg({lean:-.35,twist:.3,rx:-.5,rz:.8,re:-.5,rb:.4,lx:.3,lz:1,le:-.3,ll:.2,lr:-.2,crouch:.08,hx:-.5});default:return null}}var Eg=new Set([`strikeO`,`strikeS`,`dash`,`strikeC1`,`strikeC2`,`strikeC3`,`strikeG`]);function Dg(e,t,n){let r=e.model.parts,i=Gh(e),{spd:a,t:o,hk:s,lookSm:c}=n,l=e.state===`dead`?`idle`:e.state,u=i?Wh(e):1;e._ast!==l&&((Eg.has(e._ast)||e._ast===`linkC1`)&&(e.lastStrike=e._ast),e._ast=l,e._at=0),e._at=(e._at||0)+t;let d=i?Zh(e,l):Xh(l),f=l===`recover`?i?(e.atk===`smash`?.9:.75)/u:e.atk===`lunge`?.75:e.atk===`side`?.4:.5:0,p=z(e._at/(l===`recover`?f:l===`stagger`?.4:d||1),0,1),m=Math.min(1,a/(i?2.4:2.7));e.gaitC=(e.gaitC||0)+t*((i?2.4:3.1)+a*(i?1.5:1.9));let h=e.gaitC,g=(i?Tg:wg)(e,l,p),_=!!g;if(!g){let e=Math.sin(h)*(i?.5:.58)*m,t=Math.sin(h+Math.PI)*(i?.5:.58)*m;g=bg({lean:.04+m*(i?.16:.09)+Math.sin(o*1.6)*.012,twist:Math.sin(h)*(i?.05:.09)*m,roll:Math.sin(h)*.035*m,rx:-.2+t*.2+Math.sin(o*1.7)*.012,re:-.6-Math.max(0,-t)*.2,rb:.3+t*.3,lx:.05-e*.55-(i?.06:0),lz:.08+m*.06+Math.sin(o*1.3)*.015,le:-.25-Math.max(0,e)*.35,ll:e,lr:t,kl:Math.max(0,e)*1.25,kr:Math.max(0,t)*1.25}),i&&(g.hx=.1+m*.12,g.rz+=Math.sin(o*11)*.01*(1-m)),l===`chase`&&a<.9&&!i&&(g.crouch=.05,g.ll=.12,g.lr=-.12,g.lean=.08)}let v=e.pose||(e.pose={...g}),y=Math.min(1,t*(Eg.has(l)?38:_?15:11));for(let e of yg)v[e]+=(g[e]-v[e])*y;let b=.82*(1-Math.cos(v.crouch*2.2));r.hip.position.y=43*Im-b*.55,r.body.rotation.set(v.lean-s*.22,v.twist,v.roll);let x=l===`idle`?i?Math.round(Math.sin(o*.55)*1.4)*.55:Math.sin(o*.6)*.5:c*.7;r.head.rotation.x+=(v.hx+(i?0:Math.sin(o*1.1)*.015)-v.lean*.7-s*.45-r.head.rotation.x)*Math.min(1,t*10),r.head.rotation.y+=(x-v.twist*.55-r.head.rotation.y)*Math.min(1,t*7);let S=z(v.rb-v.rx-v.re,-2.6,2.6);r.armR.rotation.set(v.rx,0,v.rz),r.elbowR.rotation.x=v.re,r.handR.rotation.set(S,0,v.rr),r.armL.rotation.set(v.lx+s*.3,0,-v.lz-s*.3),r.elbowL.rotation.x=v.le,r.legL.rotation.x=v.ll-v.crouch,r.legR.rotation.x=v.lr-v.crouch,r.kneeL.rotation.x=v.kl+v.crouch*2,r.kneeR.rotation.x=v.kr+v.crouch*2;let C=Math.min(1,t*12),w=Math.sin(o*2.1)*.02;r.clothL.rotation.x+=((r.legL.rotation.x<0?r.legL.rotation.x*.7:r.legL.rotation.x*.45)+w+m*.04-r.clothL.rotation.x)*C,r.clothR.rotation.x+=((r.legR.rotation.x<0?r.legR.rotation.x*.7:r.legR.rotation.x*.45)+w+m*.04-r.clothR.rotation.x)*C,r.clothL.rotation.z=-Math.sin(h)*.03*m-.02,r.clothR.rotation.z=Math.sin(h)*.03*m+.02;let T=z((e.accAlong||0)*.02,-.5,.5);if(r.hat.rotation.x+=((i?.06:.04)-s*.35-T*.3+Math.sin(h*2)*.02*m-r.hat.rotation.x)*Math.min(1,t*9),r.hat.rotation.z+=(Math.sin(h)*.025*m-r.hat.rotation.z)*Math.min(1,t*9),r.knot.rotation.z=-.12+Math.sin(o*3.1)*.08+Math.sin(h*2+1)*.22*m,r.knot.rotation.x=.1+m*.25+Math.sin(o*2.3)*.05-T*.4,i){let n=l===`idle`||l===`chase`?Math.max(0,Math.sin(o*15))*(Math.sin(o*.8)>.2?.14:.02):0,i=l.startsWith(`wind`)?.35:Eg.has(l)?.55:l===`stagger`?.5:.04;r.jaw.rotation.x+=(i+n-r.jaw.rotation.x)*Math.min(1,t*18),r.fingersL&&(r.fingersL.rotation.x=.35+Math.sin(o*9+1)*.22*(.6+Math.sin(o*1.3)*.4)+s*.4);let a=(Math.sin(o*.9)>.55)*.012+s*.03;if(r.body.rotation.z+=Math.sin(o*46)*a,r.head.rotation.z=Math.sin(o*52)*a*2.2,r.hip.position.x=Math.sin(o*61)*a*.3,l===`chase`||Eg.has(l)){let n=e.game;if(Math.random()<t*6*u){let t=Math.random()*Ph;n.fx.emit(e.x+Math.cos(t)*.5,e.y+.3+Math.random()*1.5,e.z+Math.sin(t)*.5,0,.8,0,Fh[Math.random()*3|0],.07,.7,-.3)}}Eg.has(l)&&l!==`strikeG`&&e._at<.18&&Math.random()<t*30&&og(e,3866490,.22,.42),e.flash<=0&&u>1&&e.model.mat.emissive.setRGB(.04,.16+Math.sin(o*6)*.04,.07),l.startsWith(`wind`)&&e.flash<=0&&e.model.mat.emissive.setRGB(.03,.13+Math.sin(o*30)*.05,.06)}else l.startsWith(`wind`)&&e.flash<=0&&e.model.mat.emissive.setRGB(.17+Math.sin(o*30)*.06,.1,0);return{rootY:Math.abs(Math.sin(h))*(i?.03:.04)*m,rootX:(l===`dash`?.12:0)+0}}var Og=[[`head`,null],[`hat`,null],[`jaw`,null],[`knot`,null],[`armL`,null],[`elbowL`,null],[`armR`,null],[`elbowR`,null],[`legL`,null],[`kneeL`,null],[`legR`,null],[`kneeR`,null],[`clothL`,null],[`clothR`,null],[`body`,null]],kg={head:.14,hat:.06,jaw:.04,knot:.03,armL:.07,elbowL:.07,armR:.07,elbowR:.07,legL:.09,kneeL:.09,legR:.09,kneeR:.09,clothL:.05,clothR:.05,body:.14};function Ag(e,t){let n=e.obj,r=e.model.parts,i=[];n.updateMatrixWorld(!0);for(let[t]of Og){let a=r[t];if(!a)continue;n.attach(a);let o=new jt(Math.sin(e.yaw)*-1+(Math.random()-.5)*2.2,2.2+Math.random()*2.6,Math.cos(e.yaw)*-1+(Math.random()-.5)*2.2);t===`head`&&(o.y+=1.2),i.push({g:a,v:o,w:new jt((Math.random()-.5)*10,(Math.random()-.5)*6,(Math.random()-.5)*10),rest:kg[t],grounded:!1,tgt:new Dt((Math.random()<.5?1:-1)*Math.PI*.5,Math.random()*Ph,(Math.random()-.5)*.6)})}e.deadFlags.bone=i;let a=e.game;a.fx.burst(e.x,e.y+1,e.z,Ih,24,4.4,.12,.9,8,3),a.fx.ring(e.x,e.y+.3,e.z,3866490,22,4.4,.12,.6),a.shake(.3)}function jg(e,t,n){let r=e.obj,i=n.fl,a=e.game,o=e.model.parts;if(!Gh(e)){let t=n.ease(z(n.u/.7,0,1)),s=z(n.u/.25,0,1);r.position.set(e.x,e.y,e.z),r.rotation.set(0,e.yaw,0),e.model.root.rotation.x=-1.5*t*t,e.model.root.position.y=.1*t,o.body.rotation.set(-.3*s,0,0),o.head.rotation.x=-.5*s+.4*t,o.armR.rotation.set(-2.4*(1-t)-.2*t,0,.8+t*.5),o.armL.rotation.set(-1.8*(1-t),0,-(.9+t*.6)),o.elbowR.rotation.x=-.6,o.elbowL.rotation.x=-.5,o.legL.rotation.x=.4*s-.3*t,o.legR.rotation.x=-.5*s+.2*t,o.kneeL.rotation.x=.6*t,o.kneeR.rotation.x=.3*t,o.hat.rotation.x=-.4*t,!i.land&&n.u>.62&&(i.land=!0,a.fx.shockwave(e.x,e.y,e.z,14272928,1.6),a.fx.burst(e.x,e.y+.5,e.z,[13938768,16765503,16777215],10,3.2,.1,.8,8,2.5),a.shake(.2));let c=n.dissolve(1,.65,zh.pirate.death,3);r.scale.setScalar(n.bs*(1-c*c));return}if(r.position.set(e.x,e.y,e.z),r.rotation.set(0,e.yaw,0),r.scale.setScalar(n.bs),!i.bone){if(n.u<.16){let r=n.u/.16;e.model.root.rotation.x=-.25*r,o.head.rotation.x=-.6*r,o.jaw.rotation.x=.7*r,o.armR.rotation.x=-1*r,o.armL.rotation.z=-.9*r,Math.random()<t*40&&a.fx.emit(e.x+(Math.random()-.5)*.5,e.y+.5+Math.random()*1.4,e.z+(Math.random()-.5)*.5,0,1.4,0,Fh[Math.random()*3|0],.09,.6,-.4)}else e.model.root.rotation.x=0,Ag(e,n);return}let s=e.y,c=n.dissolve(1.7,.85,zh.cursedpirate.death,5);for(let n of i.bone){let r=n.g;n.v.y-=15*t,r.position.x+=n.v.x*t,r.position.y+=n.v.y*t,r.position.z+=n.v.z*t;let i=n.rest+(s-e.y);r.position.y<i&&(r.position.y=i,n.v.y<-1.2?(n.v.y*=-.32,n.v.x*=.6,n.v.z*=.6,n.w.multiplyScalar(.55),Math.random()<.5&&a.fx.dust(e.x+r.position.x,e.y,e.z+r.position.z,1,.5,14274484)):(n.v.set(0,0,0),n.grounded=!0)),n.grounded?(r.rotation.x+=(n.tgt.x-r.rotation.x)*Math.min(1,t*7),r.rotation.y+=(n.tgt.y-r.rotation.y)*Math.min(1,t*7),r.rotation.z+=(n.tgt.z-r.rotation.z)*Math.min(1,t*7)):(r.rotation.x+=n.w.x*t,r.rotation.y+=n.w.y*t,r.rotation.z+=n.w.z*t),r.scale.setScalar(1-c*c)}c>0&&!i.wisp&&(i.wisp=!0,a.vfx.glow?.(e.x,e.y+.5,e.z,3866490,3.2,.7,{grow:.6})),c>.2&&c<1&&Math.random()<t*22&&a.fx.emit(e.x+(Math.random()-.5)*1.6,e.y+.3,e.z+(Math.random()-.5)*1.6,0,2.2+Math.random()*2,0,Fh[Math.random()*3|0],.14,1,-.8)}var Mg={S:.05,sand:13807202,sandHi:15124092,sandLo:11043902,plate:9200184,spine:15984324,spineLo:14271642,mouth:6959152,tooth:15919830,eye:16761162},Ng={S:.038,shell:12886362,shellHi:14729336,shellLo:9267768,belly:15258276,dark:4863012,claw:12093768,sting:15257728,eye:16765514},Pg=(e,t,n,r)=>l(Math.floor(e),Math.floor(t),Math.floor(n),r);function Fg(e,t,n){if(t>7.2)return U(v(Mg.spineLo,Mg.spine,Math.min(1,(t-7)/4)),.04,Pg(e,t,n,2));let r=Math.floor(n/4)%2?Mg.sand:Mg.sandLo;return U(v(r,Mg.plate,t<3?.35:.1),.05,Pg(e,t,n,4))}function Ig(){let e=new If(-14,-2,-32,14,26,28,1.15),t=(e,t,n)=>Fg(e,t,n);e.own(`s2`),e.cap([0,5.2,6],[0,5.2,-4],6.4,6.2,t),e.own(`s1`),e.cap([0,5.4,14],[0,5.2,6],6.2,6.4,t),e.own(`s3`),e.cap([0,5.2,-4],[0,5,-14],6.2,5.6,t),e.own(`s4`),e.cap([0,5,-14],[0,4.4,-24],5.6,4.2,t),e.own(`tail`),e.cap([0,4.4,-24],[0,3.6,-31],4.2,2.2,t),e.own(`head`),e.cap([0,5.6,22],[0,5.4,14],5.4,6.2,t),e.ell([0,6.2,24],[5.2,4.6,4.2],t),e.own(`jaw`),e.ell([0,3.4,24.5],[4.2,2.2,3.4],(e,t,n)=>n>25.5?Mg.mouth:Fg(e,t,n));for(let t of[-1,1])e.line([t*1.2,4.2,26],[t*1.6,3.2,28.2],Mg.tooth),e.line([t*2.6,4.4,25.4],[t*3,3.4,27.4],Mg.tooth);e.set(0,5.6,27.2,Mg.mouth);for(let[t,n,r,i]of[[`head`,20,7.2,11],[`head`,16,7.4,12],[`s1`,12,7.6,13],[`s1`,8,7.6,12],[`s2`,3,7.5,13],[`s2`,-1,7.4,12],[`s3`,-7,7,11],[`s3`,-11,6.6,10],[`s4`,-17,6,9],[`s4`,-21,5.4,7]])e.own(t),e.cap([0,r,n],[0,r+i,n+.6],1.7,.45,()=>Mg.spine);return e.own(`head`),e.set(2.2,8.2,22,Mg.eye,!0),e.set(-2.2,8.2,22,Mg.eye,!0),e}var Lg=[{id:`s2`,parent:null,pivot:[0,5.2,1]},{id:`s1`,parent:`s2`,pivot:[0,5.2,6]},{id:`head`,parent:`s1`,pivot:[0,5.4,14]},{id:`jaw`,parent:`head`,pivot:[0,4.2,22]},{id:`s3`,parent:`s2`,pivot:[0,5.2,-4]},{id:`s4`,parent:`s3`,pivot:[0,5,-14]},{id:`tail`,parent:`s4`,pivot:[0,4.4,-24]}],Rg=null;function zg(){Rg||(Rg=Lf(Ig(),Lg,Mg.S));let e=at({vertexColors:!0,emissive:new N(0)}),{root:t,groups:n}=zf(Rg,e);return{root:t,mat:e,parts:{segs:[n.head,n.s1,n.s2,n.s3,n.s4,n.tail],head:n.head,jaw:n.jaw,tail:n.tail},tris:Rg.tris}}function Bg(e,t,n){let r=t<3.2?.45:Math.abs(e)<1.2?.25:0;return U(v(Ng.shellLo,Ng.shellHi,.35+r),.05,Pg(e,t,n,6))}function Vg(){let e=new If(-26,-1,-18,26,30,26,1.2);e.own(`body`),e.ell([0,4.2,2],[7.2,3.2,8.4],Bg),e.ell([0,3.2,2],[5.4,2.2,6.5],()=>Ng.belly),e.own(`head`),e.ell([0,4,12],[4.6,2.6,3.6],Bg),e.set(1.4,5.6,13.4,Ng.eye,!0),e.set(-1.4,5.6,13.4,Ng.eye,!0);for(let t=0;t<4;t++){let n=7.5-t*4.4;for(let r of[1,-1]){let i=(r>0?`L`:`R`)+t;e.own(i);let a=r*6.4,o=r*12.5,s=r*20;e.cap([a,3.4,n],[o,7.2,n+.6],1.05,.85,Bg),e.cap([o,7.2,n+.6],[s,.45,n+2.2],.85,.45,Bg)}}return e.own(`clawL`),e.cap([3.5,4.2,13],[8,5.4,17],1.7,2,()=>Ng.claw),e.own(`upL`),e.cap([8,6.3,17],[15,7.5,23],1.25,.5,()=>Ng.shellHi),e.own(`loL`),e.cap([8,3.3,17],[14.5,2.1,22.5],1.1,.48,()=>Ng.claw),e.own(`clawR`),e.cap([-3.5,4.2,13],[-8,5.4,17],1.7,2,()=>Ng.claw),e.own(`upR`),e.cap([-8,6.3,17],[-15,7.5,23],1.25,.5,()=>Ng.shellHi),e.own(`loR`),e.cap([-8,3.3,17],[-14.5,2.1,22.5],1.1,.48,()=>Ng.claw),e.own(`t1`),e.cap([0,5.2,-6],[0,8,-8],2.2,1.8,Bg),e.own(`t2`),e.cap([0,8,-8],[0,12,-4],1.8,1.5,Bg),e.own(`t3`),e.cap([0,12,-4],[0,15,2],1.5,1.2,Bg),e.own(`t4`),e.cap([0,15,2],[0,16.2,8],1.2,.9,Bg),e.own(`sting`),e.cap([0,16.2,8],[0,14.2,13],.9,.35,()=>Ng.sting),e.set(0,13.6,13.4,Ng.eye,!0),e}var Hg=[{id:`body`,parent:null,pivot:[0,4.2,2]},{id:`head`,parent:`body`,pivot:[0,4,9]},{id:`clawL`,parent:`head`,pivot:[4,4.2,14]},{id:`upL`,parent:`clawL`,pivot:[8,6.3,17]},{id:`loL`,parent:`clawL`,pivot:[8,3.3,17]},{id:`clawR`,parent:`head`,pivot:[-4,4.2,14]},{id:`upR`,parent:`clawR`,pivot:[-8,6.3,17]},{id:`loR`,parent:`clawR`,pivot:[-8,3.3,17]},{id:`L0`,parent:`body`,pivot:[6.4,3.4,7.5]},{id:`L1`,parent:`body`,pivot:[6.4,3.4,3.1]},{id:`L2`,parent:`body`,pivot:[6.4,3.4,-1.3]},{id:`L3`,parent:`body`,pivot:[6.4,3.4,-5.7]},{id:`R0`,parent:`body`,pivot:[-6.4,3.4,7.5]},{id:`R1`,parent:`body`,pivot:[-6.4,3.4,3.1]},{id:`R2`,parent:`body`,pivot:[-6.4,3.4,-1.3]},{id:`R3`,parent:`body`,pivot:[-6.4,3.4,-5.7]},{id:`t1`,parent:`body`,pivot:[0,5.2,-6]},{id:`t2`,parent:`t1`,pivot:[0,8,-8]},{id:`t3`,parent:`t2`,pivot:[0,12,-4]},{id:`t4`,parent:`t3`,pivot:[0,15,2]},{id:`sting`,parent:`t4`,pivot:[0,16.2,8]}],Ug=null;function Wg(){Ug||(Ug=Lf(Vg(),Hg,Ng.S));let e=at({vertexColors:!0,emissive:new N(0)}),{root:t,groups:n}=zf(Ug,e),r=e=>n[e];return{root:t,mat:e,parts:{body:n.body,head:n.head,claws:[n.clawL,n.clawR],uppers:[n.upL,n.upR],lowers:[n.loL,n.loR],legs:[r(`L0`),r(`L1`),r(`L2`),r(`L3`),r(`R0`),r(`R1`),r(`R2`),r(`R3`)],tail:[n.t1,n.t2,n.t3,n.t4],sting:n.sting},tris:Ug.tris}}var Gg=e({FX:()=>Yg,animate:()=>t_,busy:()=>Xg,dead:()=>n_,holdsWarn:()=>Zg,think:()=>e_}),Kg=[15124092,15984324,9200184],qg=new Set([`windup`]),Jg=new Set([`breach`,`thrash`]),Yg={spark:[15984324,15124092,16777215],burst:[13807202,15984324,9200184],death:[13807202,15984324,6959152,16777215],tele:15118410,accel:8,accelFn:e=>e.state===`breach`?26:e.state===`buried`?10:8,knock:4.2,stun:.12,plateY:2.4,deathDur:1.8,heavy:!0,noLift:!0},Xg=e=>Jg.has(e.state),Zg=e=>qg.has(e.state),Qg={windup:.7,breach:.42,thrash:.55,recover:.6};function $g(e,t,n){let r=e.game;for(let i=0;i<t;i++){let t=Math.random()*Mp,a=Math.random()*.8;r.fx.emit(e.x+Math.cos(t)*a,e.y+n,e.z+Math.sin(t)*a,Math.cos(t)*1.4,1.6+Math.random(),Math.sin(t)*1.4,Kg[i%3],.08,.45,2)}}function e_(e,t,n){let{g:r,P:i,dist:a,sees:o}=n;typeof e.wanderT!=`number`&&(e.wanderT=2);let s=Math.hypot(e.x-e.home.x,e.z-e.home.z)>42,c=0,l=0,u=e.state,d=t=>{e.state=t,e.t=0,e.hitDone=!1};if(u===`idle`||u===`wander`||u===`chase`){if(o&&!s&&a<18)d(`buried`),e.cd=.4;else if(o&&!s)d(`buried`);else{if(e.wanderT-=t,e.wanderT<=0){e.wanderT=2.5+Math.random()*3;let t=Math.random()*Mp;e.wx=e.home.x+Math.cos(t)*(4+Math.random()*8),e.wz=e.home.z+Math.sin(t)*(4+Math.random()*8),d(`wander`)}if(u===`wander`){let n=e.wx-e.x,r=e.wz-e.z,i=Math.hypot(n,r);i<1.2?d(`idle`):(Pp(e,Math.atan2(n,r),2.2,t),c=n/i*e.def.speed*.45,l=r/i*e.def.speed*.45)}}return[c,l]}if(u===`buried`){if(Math.random()<t*18&&$g(e,1,.15),!o||s||a>26)return d(`wander`),[0,0];let n=i.pos.x-e.x,u=i.pos.z-e.z;Pp(e,Math.atan2(n,u),3.4,t);let f=e.def.speed*(a>6?1.15:.55);return c=Math.sin(e.yaw)*f,l=Math.cos(e.yaw)*f,e.cd<=0&&a<7.5&&(d(`windup`),e.dive={x:i.pos.x,z:i.pos.z},e.warn(`circle`,2.4,0,Qg.windup,!0),r.audio.tone(70,.45,`sawtooth`,.08,-40)),[c,l]}if(u===`windup`){if(e.t>.15&&Math.random()<t*30&&$g(e,2,.3),e.dive){let n=e.dive.x-e.x,r=e.dive.z-e.z;Math.hypot(n,r)>.4&&Pp(e,Math.atan2(n,r),4,t)}return e.t>=Qg.windup&&(e.clearWarn(),d(`breach`),r.fx.ring(e.x,e.y+.2,e.z,15118410,16,3.2,.1,.45),r.shake(.28),$g(e,10,.4)),[0,0]}if(u===`breach`){let t=Math.sin(z(e.t/.22,0,1)*Math.PI)*7;return c=Math.sin(e.yaw)*t,l=Math.cos(e.yaw)*t,!e.hitDone&&e.t>.12&&(e.hitDone=!0,Vp(e,i,{dmg:e.def.dmg+2,reach:3.1,arc:.9,knock:5,col:Kg})&&r.audio.hit?.()),e.t>=Qg.breach&&d(a<3.4?`thrash`:`recover`),[c,l]}return u===`thrash`?(!e.hitDone&&e.t>.18&&(e.hitDone=!0,Vp(e,i,{dmg:e.def.dmg,reach:3.4,arc:1.6,knock:6,col:Kg})&&r.audio.hit?.(),$g(e,6,.5)),e.t>=Qg.thrash&&(d(`recover`),e.cd=1.1),[0,0]):(u===`recover`&&e.t>=Qg.recover&&d(`buried`),[0,0])}function t_(e,t,n){let r=e.model.parts,i=e.state,a=i===`buried`||i===`wander`?1:i===`breach`?.4:.15;e.wave=(e.wave||0)+t*(i===`buried`?9:4.5);let o=i===`buried`?.55:i===`thrash`?.9:.28;r.segs.forEach((t,n)=>{let r=Math.sin(e.wave-n*.85);t.rotation.y=r*o*(n===0?.45:1),t.rotation.z=Math.sin(e.wave*.5-n)*.08*a});let s=i===`buried`||i===`wander`||i===`idle`||i===`windup`,c=s?i===`windup`?-.35:-.72:0;if(i===`windup`&&(c=-.72+Ip(z(e.t/.7,0,1))*.45),i===`breach`){let t=z(e.t/.22,0,1),n=Math.sin(t*Math.PI);c=-.15+n*1.15;let i=[.15,.42,.12,-.08,-.2,-.3];r.segs.forEach((e,t)=>{e.rotation.x=i[t]*n}),r.head.rotation.x=-.2+.75*t,r.jaw.rotation.x=.95*Math.sin(z(e.t/.28,0,1)*Math.PI)}else i===`thrash`?(c=.05,r.head.rotation.x=Math.sin(e.t*16)*.35,r.jaw.rotation.x=.4,r.segs.forEach((t,n)=>{t.rotation.z=Math.sin(e.t*14-n)*.45})):(r.head.rotation.x+=((s?.35:.05)-r.head.rotation.x)*Math.min(1,t*6),r.jaw.rotation.x+=((s?.1:.2)-r.jaw.rotation.x)*Math.min(1,t*6));return i===`windup`&&e.model.mat.emissive.setRGB(.35,.22,.05),{rootY:c,rootX:i===`breach`?-.15:s?.08:0}}function n_(e,t,n){let{u:r,ease:i,side:a,bs:o,dissolve:s}=n,c=e.obj,l=e.model.parts,u=i(z(r/.55,0,1));c.rotation.set(0,e.yaw,a*1.2*u),c.position.set(e.x,e.y+.2*(1-u),e.z),l.segs.forEach((e,t)=>{e.rotation.y=a*.35*u*(t-2)*.3,e.rotation.x=.2*u}),l.jaw.rotation.x=.6*u;let d=s(1.05,.6,[13807202,15984324,6959152,16777215],4);c.scale.setScalar(o*(1-d*d))}var r_=e({FX:()=>s_,animate:()=>f_,busy:()=>c_,dead:()=>p_,holdsWarn:()=>l_,think:()=>d_}),i_=[14729336,9267768,15257728],a_=new Set([`windup`,`stingwind`]),o_=new Set([`snap`,`sting`]),s_={spark:[15257728,14729336,16777215],burst:[12886362,9267768,15258276],death:[12886362,4863012,15257728,16777215],tele:14725200,accel:11,knock:3.2,stun:.16,plateY:1.6,deathDur:1.5,heavy:!1},c_=e=>o_.has(e.state),l_=e=>a_.has(e.state),u_={windup:.38,snap:.28,stingwind:.62,sting:.34,recover:.45};function d_(e,t,n){let{g:r,P:i,dist:a,sees:o}=n;typeof e.wanderT!=`number`&&(e.wanderT=2);let s=Math.hypot(e.x-e.home.x,e.z-e.home.z)>36,c=0,l=0,u=e.state,d=t=>{e.state=t,e.t=0,e.hitDone=!1};if(u===`idle`||u===`wander`||u===`chase`){if(o&&!s)d(`scuttle`),e.side=Math.random()<.5?-1:1,e.cd=Math.max(e.cd||0,.35);else{if(e.wanderT-=t,e.wanderT<=0){e.wanderT=2+Math.random()*3;let t=Math.random()*Mp;e.wx=e.home.x+Math.cos(t)*(3+Math.random()*6),e.wz=e.home.z+Math.sin(t)*(3+Math.random()*6),d(`wander`)}if(u===`wander`||e.wx){let n=(e.wx??e.home.x)-e.x,r=(e.wz??e.home.z)-e.z,i=Math.hypot(n,r)||1;i<1?d(`idle`):(Pp(e,Math.atan2(n,r),3,t),c=n/i*e.def.speed*.55,l=r/i*e.def.speed*.55)}}return[c,l]}if(u===`scuttle`){if(!o||s||a>20)return d(`wander`),[0,0];let n=i.pos.x-e.x,u=i.pos.z-e.z;Pp(e,Math.atan2(n,u),4.5,t);let f=e.def.speed,p=a>3.2?1:a<2.2?-.35:.15,m=e.side||1;return c=Math.sin(e.yaw)*f*p+Math.cos(e.yaw)*f*.55*m,l=Math.cos(e.yaw)*f*p-Math.sin(e.yaw)*f*.55*m,e.cd<=0&&a<2.8?(d(`windup`),e.warn(`line`,2.2,3.2,u_.windup),r.audio.tone(180,.16,`square`,.05,40)):e.cd<=0&&a<6.5&&a>3&&(d(`stingwind`),e.dive={x:i.pos.x,z:i.pos.z},e.warn(`circle`,1.6,0,u_.stingwind,!0),r.audio.tone(90,.35,`sawtooth`,.06,-20)),Math.random()<t*.35&&(e.side=-e.side),[c,l]}return u===`windup`?(e.t>=u_.windup&&(e.clearWarn(),d(`snap`)),[Math.sin(e.yaw)*1.5,Math.cos(e.yaw)*1.5]):u===`snap`?(!e.hitDone&&e.t>.08&&(e.hitDone=!0,Vp(e,i,{dmg:e.def.dmg,reach:2.6,arc:.8,knock:3.5,col:i_})&&r.audio.hit?.()),e.t>=u_.snap&&(d(`recover`),e.cd=.7),[0,0]):u===`stingwind`?(e.dive&&Pp(e,Math.atan2(e.dive.x-e.x,e.dive.z-e.z),3,t),e.t>=u_.stingwind&&(e.clearWarn(),d(`sting`),r.fx.ring(e.x+Math.sin(e.yaw)*1.6,e.y+.15,e.z+Math.cos(e.yaw)*1.6,15257728,10,1.8,.08,.35)),[0,0]):u===`sting`?(!e.hitDone&&e.t>.1&&(e.hitDone=!0,Vp(e,i,{dmg:e.def.dmg+3,reach:3.3,arc:.55,knock:2.2,col:i_})&&(r.audio.hit?.(),r.hud.floatText(...r.screenOf(i.pos.x,i.pos.y+1.6,i.pos.z),`Stung`,`gold`))),e.t>=u_.sting&&(d(`recover`),e.cd=1.3),[Math.sin(e.yaw)*2,Math.cos(e.yaw)*2]):(u===`recover`&&e.t>=u_.recover&&d(`scuttle`),[0,0])}function f_(e,t,n){let r=e.model.parts,i=e.state,a=i===`scuttle`||i===`wander`||i===`chase`;e.step=(e.step||0)+t*(a?14:3);let o=a?.55:.08;r.legs.forEach((t,n)=>{let r=n<4?1:-1,i=n%2==0!=n>=4,a=e.step+(i?0:Math.PI),s=Math.sin(a);t.rotation.y=r*s*o,t.rotation.z=r*(.1+Math.max(0,Math.cos(a))*o*.7)});let s=Math.min(1,t*10),c=.2;i===`windup`&&(c=.2+z(e.t/.38,0,1)*.55),i===`snap`&&(c=-.35),r.uppers.forEach(e=>{e.rotation.x+=(c-e.rotation.x)*s}),r.lowers.forEach(e=>{e.rotation.x+=(-c-e.rotation.x)*s});let l=i===`snap`?.45:i===`windup`?.2:0;r.claws[0].rotation.y=-l,r.claws[1].rotation.y=l;let u=i===`stingwind`?-.9*z(e.t/.62,0,1):i===`sting`?.85*(1-z(e.t/.2,0,1)):-.35;r.tail.forEach((e,t)=>{e.rotation.x+=(u*(.5+t*.18)-e.rotation.x)*s}),r.sting.rotation.x+=((i===`sting`?.8:u*.4)-r.sting.rotation.x)*s,r.head.rotation.y=(n.lookSm||0)*.4;let d=a?Math.abs(Math.sin(e.step))*.04:0;if(i===`windup`||i===`stingwind`){let t=.2+Math.sin(e.t*28)*.1;e.model.mat.emissive.setRGB(t,t*.55,.02)}return{rootY:d+(i===`sting`?.06:0),rootX:i===`snap`?.12:a?.04:0}}function p_(e,t,n){let{u:r,ease:i,side:a,bs:o,dissolve:s}=n,c=e.obj,l=e.model.parts,u=i(z(r/.45,0,1));c.rotation.set(a*1.4*u,e.yaw,0),c.position.set(e.x,e.y,e.z),l.legs.forEach((e,t)=>{e.rotation.z=(t<4?1:-1)*.9*u}),l.uppers.forEach(e=>{e.rotation.x=.5*u}),l.lowers.forEach(e=>{e.rotation.x=-.5*u}),l.tail.forEach(e=>{e.rotation.x=.35*u});let d=s(.85,.55,[12886362,9267768,15257728,16777215],4);c.scale.setScalar(o*(1-d*d))}var m_=e({DEFS:()=>__,FX:()=>v_,TYPES:()=>g_,animate:()=>S_,busy:()=>y_,dead:()=>C_,holdsWarn:()=>b_,think:()=>x_}),h_={sandworm:Gg,scorpion:r_},g_=new Set([`sandworm`,`scorpion`]),__={sandworm:{name:`Sand Spine Worm`,hp:180,radius:1.15,speed:3.6,dmg:8,gold:[40,70],aggro:16,build:zg},scorpion:{name:`Desert Scorpion`,hp:90,radius:.85,speed:4.2,dmg:5,gold:[22,40],aggro:14,build:Wg}},v_={sandworm:Yg,scorpion:s_},y_=e=>h_[e.type].busy(e),b_=e=>h_[e.type].holdsWarn(e),x_=(e,t,n)=>h_[e.type].think(e,t,n),S_=(e,t,n)=>h_[e.type].animate(e,t,n),C_=(e,t,n)=>h_[e.type].dead(e,t,n),w_=[Em,Nh,m_],T_=new Map,E_={};for(let e of w_){for(let t of e.TYPES)T_.set(t,e);Object.assign(E_,e.DEFS)}var D_=e=>T_.get(e)?.FX[e]||null,O_=[{id:`restless`,name:`The Restless Gate`,series:`Oakhollow`,kind:`quest`,points:1,giver:`Mira`,requires:[],reward:{gold:20},blurb:`The guild receptionist has a name on her board and a story she does not like telling.`,opening:`The road into Oakhollow ends at a guild hall with a teal roof and a board of names. Mine was not on it yet. North of the houses the trees turn the wrong color, and something in that color has been keeping the receptionist at her desk past dusk.`,steps:[{id:`mira-ask`,kind:`talk`,npc:`guild`,objective:`Speak with Mira at the Hunter Guild`,lines:[`You have the look of someone who has not run from the north road yet. Good. The board is short a name.`,`The Monster Gate used to sleep. This season it does not. Things come through that were never born in these fields.`],choices:[{id:`lore`,label:`Tell me what the gate is.`,reply:`An old arch in the north wood. It opens onto somewhere else. We posted hunters. The hunters stopped coming back with clean reports. Walk up and see it, then come and tell me you still want the work.`,journal:`Mira called it an arch in the north wood that opens onto somewhere else. The hunters she posted there have stopped coming back with clean reports. She asked me to walk up and see the gate before I put my name on the board.`},{id:`blade`,label:`Put my name on the board.`,reply:`Bold, and maybe foolish, which is how most hunters start. I will write you down. First walk north and look at the gate with your own eyes. I do not send the blind.`,journal:`I told Mira to put my name on the board. She did, and then she told me I was not allowed to be blind about it. The gate is north of the houses. She wants me to see it before the work begins.`}]},{id:`see-gate`,kind:`visit`,spot:`gate`,radius:14,objective:`Walk up to the Monster Gate`,journal:`The arch stands in a ring of purple fire, and the air in front of it is the wrong temperature. I could hear something moving on the far side, the way you hear a crowd through a shut door. The grass around the stones is beaten flat by things that do not leave bootprints.`},{id:`mira-back`,kind:`talk`,npc:`guild`,objective:`Return to Mira`,lines:[`You came back on your own feet. That already puts you ahead of last week's volunteer.`,`The board pays for five of whatever comes through. Slimes, boars, the shades after dark. Not the chickens. The chickens were here before the gate and they have done nothing wrong.`,`Do the five. Bring me the count. Then we will talk about the pit, and about staying alive.`],journal:`Mira listened without writing anything down, which I think means she believed me. The guild will pay for five creatures from the gate. Chickens do not count. She said the pit comes after, and so does staying alive.`}]},{id:`board`,name:`Five for the Board`,series:`Oakhollow`,kind:`quest`,points:2,giver:`Mira`,requires:[`restless`],reward:{gold:30},blurb:`The guild pays for five gate creatures. The chickens are not invited.`,opening:`Five marks on a board, and a receptionist who will not count a chicken among them. The gate is north. The things it sends are already in the grass.`,steps:[{id:`slay-five`,kind:`kill`,exclude:[`chicken`],count:5,objective:`Slay 5 gate creatures`,lines:[`The first one is down. My hands are still deciding whether to shake.`,`Two. The guild board looks shorter from this side of the fight.`,`Three. Whatever is sending them has not noticed me yet, or it has and does not care.`,`Four. The grass here remembers every fight. I am trying not to add my own shape to it.`,`Five. I can go back to Mira with a number she will write in ink.`]},{id:`report`,kind:`talk`,npc:`guild`,objective:`Report the five to Mira`,lines:[`Five. I will mark the board, and I will pay you what the guild promised.`,`There is a smith on the rim of Greyrock Pit, just outside town. Bram. He moved the forge out of the square so the ore would not have to walk so far.`,`Take him the copper from the pit. One lump, smelted into a bar. A hunter with no plate is a story I am tired of telling.`],journal:`Mira marked the board and paid the guild's price. She sent me to Bram. He has moved the forge to the rim of Greyrock Pit, and she wants a copper bar in my hands before she will call me equipped.`}]},{id:`pit`,name:`Copper from the Pit`,series:`Oakhollow`,kind:`quest`,points:2,giver:`Bram`,requires:[`board`],reward:{gold:25},blurb:`Bram works the forge on the south rim of Greyrock Pit. He wants a copper bar, not a promise.`,opening:`Mira's directions were plain. East out of the houses, the ground rises into a ring of stone, and the ring has a hole in it. The smith is on the south lip, with the town at his back and the ore at his feet.`,steps:[{id:`meet-bram`,kind:`talk`,npc:`smith`,objective:`Speak with Bram at Greyrock Pit`,lines:[`Mira sends me the ones who have already bled a little. You qualify.`,`The pit is the round hole behind me. The orange rocks are copper. Hit one until it gives.`,`Bring the ore to the smithy door and smelt a copper bar. Then come back and show me the bar. I will not take it. A smith who keeps the first bar is a thief.`],journal:`Bram stands by a forge on the rim, close enough to the pit that the ore is still warm in the story he tells. He wants one copper ore, smelted at the smithy into a bar, and he says he will not take the bar from me.`},{id:`ore`,kind:`hold`,goods:[{id:`copper_ore`,n:1}],also:[{id:`copper_bar`,n:1}],alsoJournal:`I already had a copper bar in the bag. Bram's rocks can wait. The smithy has done this work once, and the bar is the part he asked to see.`,objective:`Mine 1 copper ore`,journal:`The pit floor is gravel and old stone, and the orange rocks give up their color if you hit them long enough. I have copper. The smithy door is on the rim above me.`},{id:`bar`,kind:`hold`,goods:[{id:`copper_bar`,n:1}],also:[{id:`iron_bar`,n:1}],alsoJournal:`I already had an iron bar from the old copper-and-tin recipe. Bram asked to see a bar, and this one still counts.`,objective:`Smelt a copper bar at the smithy`,journal:`The hearth took the ore and gave back one bar, orange and heavy. It looks too simple for the trouble, which is what Bram said copper always looks like.`},{id:`show-bar`,kind:`talk`,npc:`smith`,objective:`Show the copper bar to Bram`,lines:[`That is a true bar. Keep it. Armor and blades both start there, and so do arrowheads if you ever decide to be clever.`,`The forge beside me will shape it when you are ready. Monster parts, too, if the gate gives you any. I hammer what you bring. I do not hunt.`],journal:`Bram turned the bar in the light and gave it back. The forge next to him will make it into a blade or a plate when I ask. He hunts nothing himself. He only keeps the people who do from breaking.`}]},{id:`lira`,name:`Lira's Quiet Shelf`,series:`Oakhollow`,kind:`miniquest`,points:1,giver:`Lira`,requires:[`pit`],reward:{gold:15},blurb:`The alchemist on the south road wants a feather and will not say why until she has it.`,opening:`South of the well, a stall smells like crushed leaves and hot glass. Lira sells draughts to hunters and does not enjoy being hurried.`,steps:[{id:`lira-ask`,kind:`talk`,npc:`alchemist`,objective:`Speak with Lira on the south road`,lines:[`You smell like ore and gate-smoke. Sit nowhere near the philters.`,`I am short a feather. A plain chicken feather, the kind the road-birds drop when they are offended. Bring me one and I will tell you why the shelf has been quiet.`],journal:`Lira would not stand near me until the ore-smell faded. She wants a chicken feather, and she says the reason is on the other side of the errand.`},{id:`feather`,kind:`hold`,goods:[{id:`feather`,n:1}],objective:`Pluck a feather from a chicken`,journal:`The chicken objected, then remembered it is a chicken, and left a feather in my hand. Lira's stall is back on the south road.`},{id:`lira-give`,kind:`talk`,npc:`alchemist`,objective:`Bring the feather to Lira`,deliver:{id:`feather`,n:1},lack:`That is a hand, not a feather. The white birds by the fences will donate one if you insist.`,lines:[`Good. The quiet on that shelf was a draught that would not take. Feathers remind the mixture which way is up.`,`Healing draughts for the cuts. Spirit philters for the bolt. Buy them when you are bleeding, not after. I dislike eulogies. They take so long.`],journal:`Lira took the feather as if it were a tool and not a joke. The quiet shelf was a draught that would not settle. She sells healing when I am cut and spirit when the bolt runs dry, and she would like me to buy them before the eulogy.`}]},{id:`fence`,name:`Tobin's Fence`,series:`Oakhollow`,kind:`quest`,points:2,giver:`Old Tobin`,requires:[`pit`],reward:{gold:25},blurb:`Slimes have found the wheat. The farmer has found the end of his patience.`,opening:`Old Tobin keeps a red tunic and a field that used to be only wheat. Something green has been hopping the fence, and the wheat is taking it personally.`,steps:[{id:`tobin-ask`,kind:`talk`,npc:`farmer`,objective:`Speak with Old Tobin`,lines:[`If you are here to tell me the slimes are harmless, the wheat would like a word.`,`They come from the gate and they bounce until they find a warm place. My field is warm. Three of them. I am not particular about the color, so long as they stop landing in the rows.`],journal:`Tobin talks to the wheat more kindly than he talks to hunters. Three slimes have been using his field as a landing. He does not care if they are the green ones or the gate-glow ones. He cares that they stop.`},{id:`slimes`,kind:`kill`,types:[`slime`,`voidslime`],count:3,objective:`Slay 3 slimes`,lines:[`One slime fewer, and the fence looks a little taller.`,`Two. They burst like bad fruit and then the ground pretends nothing happened.`,`Three. Tobin can have his rows back.`]},{id:`tobin-back`,kind:`talk`,npc:`farmer`,objective:`Tell Old Tobin the field is clear`,lines:[`Three. I will believe you when the rows stay empty until supper, and I will pay you now because I am old and impatient.`,`If they come back I will be here. The wheat is not going anywhere. That is the trouble with wheat.`],journal:`Tobin paid me before supper and said he would believe the field was safe when the field agreed. The slimes may come back. He will still be by the fence. Wheat, he says, is not famous for leaving.`}]},{id:`shiny`,name:`Pip's Shiny Stone`,series:`Oakhollow`,kind:`miniquest`,points:1,giver:`Pip`,requires:[`pit`],reward:{gold:10},blurb:`The apprentice wants a stone from the pit and will not be talked out of it.`,opening:`Pip is smaller than his opinions. He has decided that hunters bring back shiny things, and he has decided that I am a hunter.`,steps:[{id:`pip-ask`,kind:`talk`,npc:`child`,objective:`Speak with Pip`,lines:[`You went to the gate. I saw the way you walked back. That is a gate-walk.`,`Bring me a shiny stone from the pit. The orange ones. Bram says they are ore and I say they are treasure, and I am right until he is looking.`],journal:`Pip has appointed me a hunter and given me a quest he invented. He wants an orange stone from Greyrock Pit. Bram calls it ore. Pip calls it treasure whenever Bram is not in earshot.`},{id:`pip-ore`,kind:`hold`,goods:[{id:`copper_ore`,n:1}],objective:`Get a copper ore for Pip`,journal:`The pit gave up an orange stone. Pip is somewhere near the square, being shorter than the stalls and louder than them.`},{id:`pip-give`,kind:`talk`,npc:`child`,objective:`Give the copper ore to Pip`,deliver:{id:`copper_ore`,n:1},lack:`That is not shiny enough. The orange rocks in the pit. Bram pretends they are for hammers.`,lines:[`It is warm. I am going to keep it in the pocket that does not have holes. Thank you for not telling Bram it was treasure.`,`When I am tall I will go through the gate and bring you something better. Do not tell Mira I said tall. She will measure me.`],journal:`Pip put the ore in the pocket he trusts and made me promise not to call it ore in front of Bram. He intends to cross the gate when he is tall. He also intends for Mira not to measure him.`}]},{id:`mark`,name:`The Guild's Mark`,series:`Oakhollow`,kind:`quest`,points:2,giver:`Mira`,requires:[`lira`,`fence`,`shiny`],reward:{gold:40},blurb:`Mira keeps one more conversation for hunters who have walked the whole town.`,opening:`The pit, the field, the stall, and the boy with the ore in his pocket. Mira has been counting those errands the way she counts bodies on the board.`,steps:[{id:`mira-mark`,kind:`talk`,npc:`guild`,objective:`Speak with Mira at the guild`,lines:[`Bram says you can hold a bar. Lira says you can follow a strange instruction. Tobin says the wheat survived you. Pip says you are tall, which I am choosing to ignore.`,`This is the mark. Not a medal. A note on the board that you came back from more than one kind of work.`,`The gate is still open. The board will keep a number on it. When that number gets heavy, you already know the pit, the forge, and the woman who sells the things that keep you standing.`],journal:`Mira called it a mark, not a medal: a note that I came back from more than one kind of work. The gate is still open. The board will keep its number. I know where the iron is, and who sells the draughts, and which fence the slimes prefer. That is the whole of the starter town, and it is enough to leave it on purpose.`}]},{id:`deepdig`,name:`The Deep Dig`,series:`Oakhollow`,kind:`miniquest`,points:1,giver:`Bram`,requires:[`pit`],reward:{gold:35},blurb:`Greyrock is copper. Bram wants iron from the hole they call Deepwell.`,opening:`Bram has one more errand once the first bar is in your hands. The pit behind him is the starter hole. South of Southford, the desert has a bigger one, and the rocks there are not orange.`,steps:[{id:`deep-ask`,kind:`talk`,npc:`smith`,objective:`Ask Bram about the Deepwell dig`,lines:[`Greyrock is copper. That is how a hunter starts. It is not how a hunter finishes.`,`South of Southford the dunes open into a pit they call Deepwell. Iron, then coal, then mithril and adamite if you live long enough to swing at them.`,`Bring me one iron ore from that hole. I will not take it. I want to know you found the place.`],journal:`Bram sent me south of Southford, into the desert pit called Deepwell. He wants one iron ore from those rocks. Copper will not count.`},{id:`iron-ore`,kind:`hold`,goods:[{id:`iron_ore`,n:1}],objective:`Mine 1 iron ore at Deepwell`,journal:`The Deepwell rocks gave up a rust-brown lump. Bram is still on the rim of Greyrock, pretending he does not care whether I found the way.`},{id:`show-iron`,kind:`talk`,npc:`smith`,objective:`Show Bram the iron ore`,lines:[`That is iron. Heavy, ugly, and honest. Smelt it here if you want another bar, or take coal from the same pit and make steel.`,`The blue rocks are mithril. The green ones are adamite. Titanium lives in Cinderfall, platinum on Glimmerfrost. They will not open for a pick until your arms remember the work.`],journal:`Bram turned the iron ore and gave it back. Deepwell also holds coal, mithril and adamite, each behind a higher Mining level. Titanium is in Cinderfall, platinum on Glimmerfrost. The smithy will take whatever I bring.`}]},{id:`burntpan`,name:`Lira's Burnt Pan`,series:`Oakhollow`,kind:`miniquest`,points:1,giver:`Lira`,requires:[`lira`],reward:{gold:20},blurb:`The alchemist wants a shrimp off the fire, cooked or ruined. She is collecting data.`,opening:`Lira has decided that hunters who can follow a strange instruction can also follow a fire. She wants a shrimp from Mirrormere, put on a campfire, and she will take it whether it comes out gold or black.`,steps:[{id:`pan-ask`,kind:`talk`,npc:`alchemist`,objective:`Speak with Lira about the fire`,lines:[`The feather settled. The next quiet on that shelf is a draught that hates guesswork.`,`Net a shrimp at Mirrormere. Light a fire. Cook it. If you burn it I will still take it. I am measuring the difference, not your pride.`],journal:`Lira wants a shrimp cooked on a campfire. A burnt shrimp still counts. She is measuring the difference, she says, not my pride.`},{id:`cooked`,kind:`hold`,goods:[{id:`cooked_shrimp`,n:1}],also:[{id:`burnt_shrimp`,n:1}],alsoJournal:`I burnt the shrimp. Lira said that still counted. The stall on the south road is waiting for the black one as cheerfully as it would have waited for the gold one.`,objective:`Cook a shrimp on a campfire`,journal:`The fire took the shrimp and gave it back cooked. Lira's stall is on the south road, and she asked for this on purpose.`},{id:`pan-give`,kind:`talk`,npc:`alchemist`,objective:`Bring Lira a cooked or burnt shrimp`,deliver:{id:`cooked_shrimp`,n:1},alsoDeliver:{id:`burnt_shrimp`,n:1},lack:`That is not a shrimp from the fire. Net one at the lake, cook it, and try not to look so wounded if it burns.`,lines:[`Good. Gold or charcoal, the shelf has its sample. Hunters who never burn anything are lying, or they are not cooking.`,`Eat the rest yourself. A cooked catch heals more than a raw one. A burnt catch heals nothing, and it still taught the fire your name.`],journal:`Lira took the shrimp as a sample and told me to eat the rest. Cooked fish heal more than raw. Burnt fish teach the fire your name and still count as cooking practice.`}]},{id:`keepassault`,name:`The Eternal War`,series:`Embergate`,kind:`quest`,points:3,giver:`Mira`,requires:[`mark`],reward:{gold:70,gear:`ashenbrand`},blurb:`Hellspire and Dawnspire have spilled their war onto the Endless Field. Mira wants a hunter who can walk both courtyards and put the Warden down.`,opening:`The board in the guild hall has a new name on it that is not a slime. Mira has been reading reports from the north pass: black iron at one keep, white gold at the other, and something between them that answers to both.`,steps:[{id:`war-ask`,kind:`talk`,npc:`guild`,objective:`Speak with Mira about the keeps`,lines:[`The north pass is not a pasture. Ashen Road climbs into a wasteland the guild maps as Embergate.`,`Hellspire is the Demon Knight's fortress. Dawnspire is the Holy Knight's castle. They have been at this longer than Oakhollow has had a name.`,`Walk both courtyards. Put down the knights that will let you. Then stand in the field between them. The Warden waits there. If you come back with the brand it carries, the board will believe you.`],journal:`Mira sent me north through Ashen Road. Hellspire first, then Dawnspire, then the Endless Field between them. The Keep Warden carries a brand she wants on the board.`},{id:`see-hell`,kind:`visit`,spot:`hellspire`,radius:28,objective:`Enter the courtyard of Hellspire`,journal:`Hellspire is a mouth of black iron. The courtyard smells like old heat. The knights on the posts did not look surprised to see a hunter from the south.`},{id:`kill-demon`,kind:`kill`,types:[`demonknight`],count:2,objective:`Slay 2 Demon Knights at Hellspire`,journal:`Two of the black knights went down. The keep did not. I still had the white castle west of the field to walk, and Mira does not take half a report.`},{id:`see-dawn`,kind:`visit`,spot:`dawnspire`,radius:28,objective:`Enter the courtyard of Dawnspire`,journal:`Dawnspire is white stone and blue fire. The courtyard is quieter than Hellspire and somehow worse for it. The Holy Knights watch the same war from the other side.`},{id:`kill-holy`,kind:`kill`,types:[`holyknight`],count:2,objective:`Slay 2 Holy Knights at Dawnspire`,journal:`Two of the white knights fell. The field between the keeps is a grave of banners. That is where Mira said the Warden would be.`},{id:`see-field`,kind:`visit`,spot:`warfield`,radius:22,objective:`Stand on the Endless Field`,journal:`The Endless Field is swords in the ash, two colours of banner, and a knight in mixed plate that does not belong to either keep. It was waiting.`},{id:`kill-warden`,kind:`kill`,types:[`keepwarden`],count:1,objective:`Defeat the Keep Warden`,journal:`The Warden used both keeps' tricks: a hammer of light and a line of hellfire. It went down harder than a posted knight and cleaner than a dragon. The brand it carried is ugly, honest steel.`},{id:`war-back`,kind:`talk`,npc:`guild`,objective:`Return to Mira with the report`,lines:[`You walked both keeps and the dirt between them. That is more than most names on this board will ever do.`,`Keep the brand. It is not dusk steel and it is not a starter hammer. It is what a hunter carries after the war has looked at them.`,`The knights will still be there tomorrow. The Warden too. The board does not need you to end eternity. It needed you to stand in it.`],journal:`Mira took the report and left me the brand. Hellspire and Dawnspire are still at war. The guild board has a name that has been to both courtyards.`}]},{id:`gilan-pick`,name:`The Missing Pick`,series:`Gilantre`,kind:`quest`,points:1,giver:`Grimbold Ironfist`,giverNpc:`grimbold`,requires:[],reward:{gold:25},blurb:`A pick walked out of Ironhaven and into Ragnar's stall.`,opening:`Grimbold keeps the anvil in front of Ironhaven, on the south side of the well. He says his best pick is not on the bench. He says Ragnar has it, and that Ragnar will call it a loan.`,steps:[{id:`ask-grimbold`,kind:`talk`,npc:`grimbold`,objective:`Speak with Grimbold at Ironhaven`,lines:[`You have the look of someone who swings a pick. Good. Mine is missing.`,`Ragnar Stonebeard keeps the mining stall on the north side of the well. He will tell you it was a loan. Ask him whose name was on the handle, then come back.`],journal:`Grimbold's best pick is not on the Ironhaven bench. He sent me to Ragnar Stonebeard, who will call it a loan. I am to ask whose name was on the handle.`},{id:`ask-ragnar`,kind:`talk`,npc:`ragnar`,objective:`Ask Ragnar about the pick`,lines:[`The iron one with the split handle? It was on my bench so a hunter could see what a Gilantre pick looks like. Grimbold lent it. He has forgotten the lending.`,`Tell him the handle still says Ironhaven. I do not keep what I do not sell. The picks I do sell are the plain ones, and you already carry one of those if you have been in a pit.`],journal:`Ragnar says the split-handled pick was a loan for the stall, and that the handle still reads Ironhaven. He does not sell that one. He sells the plain picks, and I already carry one.`},{id:`pick-back`,kind:`talk`,npc:`grimbold`,objective:`Tell Grimbold what Ragnar said`,lines:[`A loan. I did say that, last month, and then I said it again to the coal and not to him.`,`Leave it on his bench. A stall with no iron on it looks closed. Take the coin. The anvil is here when you have bars.`],journal:`Grimbold remembered the loan once I repeated it. The split-handled pick stays on Ragnar's bench so the stall does not look closed. The anvil is there when I have bars.`}]},{id:`gilan-bowl`,name:`Onto the Sand`,series:`Gilantre`,kind:`quest`,points:1,giver:`Marcellus Valerius`,giverNpc:`marcellus`,requires:[],reward:{gold:30},blurb:`The arena master wants a hunter standing on the sand, not talking about it.`,opening:`The bowl north of the well is older than the brick wall. Marcellus Valerius keeps the doors. He does not explain the place to people who have not stood in it.`,steps:[{id:`ask-marcellus`,kind:`talk`,npc:`marcellus`,objective:`Speak with Marcellus at the arena`,lines:[`You can see the arches from the well. That is not the same as standing on the sand.`,`Walk in through the south gate. If the gate turns you around, we will both have learned something. Then come and tell me the color of the lowest course of stone.`],journal:`Marcellus will not talk about the arena until I have been in it. The south gate faces the well. He wants the color of the lowest course of stone.`},{id:`stand-sand`,kind:`visit`,spot:`coliseum`,radius:8,objective:`Stand on the sand of the arena`,journal:`The sand is pale and beaten flat. The lowest course of the wall is a yellower stone than the seats, and the joints are wider. Elwynn was right about the age. She was wrong about there being a stair.`},{id:`bowl-back`,kind:`talk`,npc:`marcellus`,objective:`Tell Marcellus you stood on the sand`,lines:[`You came back through the same gate. Most people do. A few try the seats and learn why the seats have no stairs on the inside.`,`The old stone stays. I keep the doors and the banners. If you want a fight, the prairie outside the wall has more of them than I do.`],journal:`Marcellus took the report and paid the door fee the other way around. The old stone stays. The fights, he says, are still out on the prairie.`}]},{id:`gilan-roots`,name:`Thin Fields`,series:`Gilantre`,kind:`quest`,points:1,giver:`Gwyneth Earthsong`,giverNpc:`gwyneth`,requires:[],reward:{gold:20},blurb:`Gwyneth will not cross the moat. She wants eyes on the west wood.`,opening:`Gwyneth Earthsong walks the cobbles with a basket she does not fill. The fields outside the west bridge are thin this season, and she will not go and look.`,steps:[{id:`ask-gwyneth`,kind:`talk`,npc:`gwyneth`,objective:`Speak with Gwyneth in the square`,lines:[`The wheat outside the west bridge came up and then stopped. I can see the color from the gate. I cannot see the roots.`,`Cross the drawbridge and walk to the trees on the north side of the road. Tell me if the soil is bare. I am not carrying a basket across that moat.`],journal:`Gwyneth can see the color of the west fields from the gate and nothing else. She wants me across the drawbridge, at the trees on the north side of the road, to look at the soil.`},{id:`see-grove`,kind:`visit`,spot:`westwood`,radius:16,objective:`Look at the trees west of the bridge`,journal:`The trees are standing. The grass under them is short and pale, and the soil at the roots is open in patches, as if something pulled instead of grazed. It is not a blight I have a name for. It is enough to tell Gwyneth the field is thin and the wood is not dead.`},{id:`roots-back`,kind:`talk`,npc:`gwyneth`,objective:`Tell Gwyneth what the west wood looks like`,lines:[`Standing trees and open soil. That is better than a fire and worse than a harvest.`,`I will keep the basket for the prairie on the east road. Take the coin. You walked farther than I would, which is the whole of the work.`],journal:`Gwyneth kept the basket for the east prairie. The west wood is thin and still standing. She paid for the walk she would not take.`}]},{id:`gilan-timber`,name:`The Marked Oak`,series:`Gilantre`,kind:`quest`,points:1,giver:`Elara Moonwhisper`,giverNpc:`elara`,requires:[],reward:{gold:20},blurb:`Elara marked an oak on the east road and wants it seen before someone else claims it.`,opening:`Elara Moonwhisper sells the axes and keeps the marks. There is an oak past the east drawbridge with her cut in the bark, and she does not trust the road to leave it alone.`,steps:[{id:`ask-elara`,kind:`talk`,npc:`elara`,objective:`Speak with Elara at the wood stall`,lines:[`The axe you carry will fell birch and oak. Maple waits until your arm is less hopeful.`,`Past the east bridge, on the south side of the road, there is an oak with a fresh cut in the bark and a sign under it. Go and see that the sign is still mine. Do not swing at it.`],journal:`Elara marked an oak past the east drawbridge, south of the road. I am to see that her sign is still there. I am not to swing at the tree.`},{id:`see-oak`,kind:`visit`,spot:`markoak`,radius:12,objective:`Find Elara's marked oak`,journal:`The cut in the bark is fresh and the sign is still standing. The oak is large enough for a hall beam. The prairie around it is open, and nothing else on the road has a mark.`},{id:`timber-back`,kind:`talk`,npc:`elara`,objective:`Tell Elara the oak is still marked`,lines:[`Still standing, then. Good. The hall can wait a season. A tree cut in a hurry is a beam that twists.`,`If you need the axe sharpened, the bench is here. I do not charge a hunter for looking at a tree I asked them to look at.`],journal:`Elara left the oak for another season. The sign stays. She does not charge for a look she asked for, and the axe bench is there when the edge goes dull.`}]},{id:`gilan-reed`,name:`The East Reed`,series:`Gilantre`,kind:`quest`,points:1,giver:`Lyra Swiftfoot`,giverNpc:`lyra`,requires:[],reward:{gold:15},blurb:`Lyra dries one reed on the east bank. She wants it looked at, not pulled.`,opening:`Lyra Swiftfoot sells the same draughts Lira does, from a stall on the south road inside the wall. The reed she dries grows on the east bank of the moat, and she will not say it is still good until someone has looked at the water.`,steps:[{id:`ask-lyra`,kind:`talk`,npc:`lyra`,objective:`Speak with Lyra at her stall`,lines:[`Draughts for the cuts, philters for the bolt. The prices are the same as the south road in Oakhollow. The herbs are not.`,`On the east bank of the moat, past the bridge and a little south, there is a stand of reed I cut for drying. Look at the water around it. If it is brown, tell me. If it is clear, also tell me. Do not pull the reed.`],journal:`Lyra cuts one stand of reed on the east bank, south of the bridge. I am to look at the water and leave the reed in the mud.`},{id:`see-reed`,kind:`visit`,spot:`reed`,radius:12,objective:`Look at the reed on the east bank`,journal:`The reed is green at the tips and pale at the waterline. The moat around it is dark and clear enough to show the brick of the inner bank. Nothing brown is moving in it. Lyra can dry this cutting.`},{id:`reed-back`,kind:`talk`,npc:`lyra`,objective:`Tell Lyra the water is clear`,lines:[`Clear, then. I will cut it in the morning, when the guards are bored and not watching the bank.`,`Buy a draught if you are bleeding. Looking at a reed does not close a cut, whatever the old stories say.`],journal:`The east reed is fit to dry. Lyra will cut it when the guards are bored. A draught is still the thing that closes a cut.`}]}],k_=Object.fromEntries(O_.map(e=>[e.id,e])),A_=O_.reduce((e,t)=>e+t.points,0),j_={Mira:`guild`,Bram:`smith`,Lira:`alchemist`,"Old Tobin":`farmer`,Pip:`child`,"Grimbold Ironfist":`grimbold`,"Ragnar Stonebeard":`ragnar`,"Elara Moonwhisper":`elara`,"Lyra Swiftfoot":`lyra`,"Marcellus Valerius":`marcellus`,"Gwyneth Earthsong":`gwyneth`},M_=`offer`,N_=`step`;function P_(e){return k_[e]||null}function F_(e){return e?e.giverNpc?e.giverNpc:e.giver&&j_[e.giver]?j_[e.giver]:(e.steps||[]).find(e=>e.kind===`talk`)?.npc||``:``}var I_={rampX0:88,z:66},L_={x:0,z:432,r:32,shore:16},R_={x:-74,z:514},z_={x:L_.x,z:L_.z+L_.r+52},B_={pitch:.3,dist:22,lookAhead:20},V_={x:-226,z:50},H_={x:-226,z:69},U_={pitch:.58,dist:16,lookAhead:0};function W_(){let e=Ea.find(e=>e.kind===`pirateshore`);return e?ka(e):{x:-288,z:288}}var G_=W_(),K_={x:G_.x+52,z:G_.z+104},q_={x:G_.x+50.8,z:G_.z+125},J_={pitch:.3,dist:22,lookAhead:0},Y_=1.15,X_=.35,Z_=1.7,Q_=1.5;function $_(e){let t=String(e??``),n=t.startsWith(`?`)?t.slice(1):t;return new URLSearchParams(n)}var ev={x:68.8,z:73.2,dx:1.4,dz:-1},tv={x:74.1,z:84},nv={x:72.2,z:85,dx:1,dz:1.2},rv={x:77,z:85.6,dx:0,dz:1.4},iv={...Object.fromEntries(Ea.filter(e=>e.built).map(e=>[String(e.kind).toLowerCase(),{kind:e.kind}])),oakhollow:{x:72,z:72.5},goldenmeadow:{kind:`goldmead`},greyrock:{x:I_.rampX0+4,z:I_.z},forge:{live:`forge`,x:86.3,z:72.8},oasis:{x:z_.x,z:z_.z},deepwell:{x:R_.x+22,z:R_.z},cinderfall:{kind:`cinderfall`},glimmerfrost:{kind:`glimmerfrost`},hellspire:{live:`demonKeep`,kind:`hellspire`},dawnspire:{live:`holyKeep`,kind:`dawnspire`},endlessfield:{live:`warfield`,kind:`warfield`},crate:{live:`storage`,x:ev.x,z:ev.z,dx:ev.dx,dz:ev.dz},plaza:{x:tv.x,z:tv.z},lira:{live:`alchemy`,x:nv.x,z:nv.z,dx:nv.dx,dz:nv.dz},dalla:{live:`market`,x:rv.x,z:rv.z,dx:rv.dx,dz:rv.dz},gilantre:{x:446,z:148},greenbowl:{x:z_.x,z:z_.z},lagoon:{x:H_.x,z:H_.z},canopy:{x:-354,z:110},pirateshore:{x:K_.x,z:K_.z}},av={oak:`oakhollow`,town:`oakhollow`,goldmead:`goldenmeadow`,goldmeadow:`goldenmeadow`,"golden meadow":`goldenmeadow`,"greyrock pit":`greyrock`,greyrockpit:`greyrock`,pit:`greyrock`,bram:`forge`,bramsforge:`forge`,"bram's forge":`forge`,"brams forge":`forge`,greenbowl:`oasis`,hellspirekeep:`hellspire`,"hellspire keep":`hellspire`,dawnspirekeep:`dawnspire`,"dawnspire keep":`dawnspire`,endless:`endlessfield`,warfield:`endlessfield`,"endless field":`endlessfield`,storage:`crate`,storagecrate:`crate`,"storage crate":`crate`,square:`plaza`,alchemy:`lira`,alchemist:`lira`,market:`dalla`,dallamarket:`dalla`,"dalla's market":`dalla`,"ashen road":`ashroad`,"silverrun canopy":`canopy`,"mirrormere oasis":`lagoon`,"icewind reach":`icewind`,"rimefang mesa":`rimefang`,southmead:`sunken`,runmouth:`tigerwood`,dunes:`sunspill`,dune:`sunspill`,desert:`sunspill`,sand:`sunspill`,sands:`sunspill`,waste:`ashroad`,volcanic:`ashroad`,ash:`ashroad`,lava:`cinderfall`,snow:`snowfall`,ice:`icewind`,arctic:`glimmerfrost`,jungle:`canopy`,beach:`shellbeach`,meadow:`goldmead`,forest:`canopy`,"pirate shore":`pirateshore`,piratedocks:`pirateshore`,piratedunes:`pirateshore`,reedford:`silverrunwest`,"reedford reach":`silverrunwest`,elderwood:`silverruneast`,"silverrun crossing":`silverrunriver`,"greystone summit":`silverrunpeak`},ov={...av};{let e=new Set([...Object.keys(iv),...Object.keys(av),`dunes`,`dune`,`desert`,`sand`,`sands`,`oasis`,`beach`]),t=new Map;for(let e of Ea){if(!e.built)continue;let n=String(e.name||``).toLowerCase();n&&t.set(n,(t.get(n)||0)+1)}for(let n of Ea){if(!n.built)continue;let r=String(n.name||``).toLowerCase(),i=String(n.kind).toLowerCase();r&&t.get(r)===1&&(e.has(r)||iv[r]||ov[r]||(ov[r]=i))}Object.assign(ov,av)}function sv(e=``){let t=$_(e),n=t.get(`mmo`)===`1`,r=t.get(`debug`)===`1`,i=r&&!n;return{enabled:i,tp:i?String(t.get(`tp`)||``).trim():``,unlock:i&&t.get(`unlock`)===`1`,blocked:r&&n}}function cv(e=``){return $_(e).get(`photo`)===`1`}function lv(e=``){return $_(e).get(`maplabels`)!==`0`}function uv(e=``,t){let n=$_(e);return n.get(`mmo`)===`1`||t?.mmo||t?.worldView?!1:n.get(`debug`)===`1`&&n.get(`cloudshadow`)===`strong`}function dv(e){let t=String(e||``).trim().toLowerCase().replace(/[_-]+/g,` `).replace(/\s+/g,` `);if(!t)return``;let n=t.replace(/\s+/g,``);return iv[t]?t:iv[n]?n:ov[t]?ov[t]:ov[n]?ov[n]:``}function fv(e){let t=Ea.find(t=>t.kind===e);if(!t)return null;let n=ka(t);return{x:n.x+72,z:n.z+72}}function pv(e,t){let n=dv(e);if(!n)return String(e||``).trim()&&hv(e),null;let r=iv[n],i,a;if(r.live&&t){let e=t[r.live];e&&Number.isFinite(Number(e.x))&&Number.isFinite(Number(e.z))&&(i=Number(e.x)+(Number(r.dx)||0),a=Number(e.z)+(Number(r.dz)||0))}if(i==null&&r.kind){let e=fv(r.kind);e&&(i=e.x,a=e.z)}if(i==null&&r.x!=null&&r.z!=null&&(i=r.x,a=r.z),i==null||a==null)return null;let o=gv(t,i,a);return{id:n,x:o.x,z:o.z}}function mv(){let e=Object.keys(iv).sort(),t=Object.keys(ov).sort();return{spots:e,aliases:t,text:`spots: ${e.join(`, `)} | aliases: ${t.join(`, `)}`}}function hv(e){let t=mv();console.warn(`[Monster Gate] Unknown tp key "${e}". Valid keys: ${t.text}`)}function gv(e,t,n,r=1.45){if(!e)return{x:t,z:n};let i=(t,n)=>{if(e.isWater?.(t,n)||e.playable&&!e.playable(t,n))return!1;let i=e.heightAt?.(t,n);return!(Number.isFinite(i)&&(i<.9||i>10)||e.free&&!e.free(t,n,r))};if(i(t,n))return{x:t,z:n};for(let e of[2,3.2,4.5,6,8,11])for(let r=0;r<14;r++){let a=r/14*Math.PI*2+.2,o=t+Math.cos(a)*e,s=n+Math.sin(a)*e;if(i(o,s))return{x:o,z:s}}return{x:t,z:n}}function _v(){if(typeof document>`u`||document.getElementById(`debug-badge`))return;let e=document.createElement(`div`);e.id=`debug-badge`,e.textContent=`DEBUG`,e.title=`Tester session. The hunter save is not written.`,(document.getElementById(`app`)||document.body).appendChild(e),document.body.classList.add(`debug-session`)}function vv(e,t){if(!e?.data)return;e.data.seen={...e.data.seen};for(let t of pt)e.data.seen[t.id]=!0;e.data.kills={...e.data.kills};for(let t of pt)t.id!==`chicken`&&(e.data.kills[t.id]=Math.max(e.data.kills[t.id]|0,8));e.data.crafted={...e.data.crafted};for(let t of pe)e.data.crafted[t.id]=!0;e.data.armor={helm:`darkhelm`,chest:`darkchest`,arms:`darkarms`,legs:`darklegs`,boots:`darkboots`,shield:`darkshield`},e.data.weapon=`ashenbrand`,e.data.xp={...e.data.xp};let n=$e(40);for(let t of S)e.data.xp[t]=Math.max(e.data.xp[t]||0,n);if(e.data.gold=Math.max(e.data.gold|0,8e3),e.data.portals=[...new Set([...e.data.portals||[],...Et])],t?.state){t.state.quests=t.state.quests||{};for(let e of O_){let n=t.state.quests[e.id]||{},r=e.id===`keepassault`;t.state.quests[e.id]={started:!0,done:!r,step:r?1:e.steps.length,n:n.n|0,pages:Array.isArray(n.pages)?n.pages:[],unseen:!1,choice:n.choice??null}}t.progress?.data&&(t.progress.data.journal=t.state)}}var yv={oakhollow:[`slime`,`boar`],town:[`slime`,`boar`],goldenmeadow:[`slime`,`boar`],field:[`slime`,`boar`],whispering:[`boar`,`slime`],forest:[`boar`,`slime`],greystone:[`boar`,`slime`],gate:[`slime`,`voidslime`,`wraith`],southford:[`slime`,`boar`],oasis:[`scorpion`,`sandworm`],greenbowl:[`scorpion`,`sandworm`],sunspill:[`scorpion`,`sandworm`],glassroad:[`scorpion`,`sandworm`],deepwell:[`scorpion`,`sandworm`],mirrormere:[`tiger`,`raptor`,`pirate`],brookside:[`boar`,`slime`],silverrun:[`tiger`,`raptor`],runmouth:[`cursedpirate`,`pirate`],longacre:[`boar`,`slime`],cinderfall:[`volcanum`],hellspire:[`demonknight`],glimmerfrost:[`snowyeti`],dawnspire:[`holyknight`],endlessfield:[`keepwarden`],warfield:[`keepwarden`],goldmead:[`slime`,`boar`],cave:[`slime`,`wraith`],rift:[`voidslime`,`wraith`]};function bv(e,t,n){let r=e?.world?.landAt?.(t,n);return String(r?.kind||r?.banner?.[1]||``).toLowerCase()}function xv(e){let t=String(e||``);return!(!t||t===`chicken`||Se(t)?.style===`Passive`)}function Sv(e,t=0){let n=(e||[]).filter(xv);return n.length?n[Math.min(n.length-1,t>4?n.length-1:+(t>1))]||n[0]:`slime`}function Cv(e){let t=e?.player?.pos,n=t?.x??72,r=t?.z??73,i=Math.max(0,e?.rank|0),a=e?.world?.realm;if(a===`cave`)return`slime`;if(a===`rift`)return`voidslime`;let o=bv(e,n,r),s=String(e?.zone??e?.hud?.el?.area?.textContent??``).toLowerCase(),c=s.replace(/\s+/g,``),l=o||c,u=Object.keys(yv).sort((e,t)=>t.length-e.length);for(let e of u)if(l.includes(e)||s.includes(e)||c.includes(e))return Sv(yv[e],i);let d=e?.world?.zoneAt?.(n,r);return d===6?`slime`:d===1?`boar`:`slime`}function wv(e){let t=e.player.pos,n=Number(e.player.yaw)||0,r=Number(e.cam?.yaw??n),i=-Math.sin(r),a=-Math.cos(r),o=Math.sin(n),s=Math.cos(n),c=i*.7+o*.3,l=a*.7+s*.3,u=Math.hypot(c,l)||1;return{x:c/u,z:l/u,from:t}}function Tv(e){if(!e?.player?.pos)return null;let{x:t,z:n,from:r}=wv(e),i=null;for(let a of[2,2.2,2.4,2.6,1.8]){let o=r.x+t*a,s=r.z+n*a,c=e.world;if((!c?.playable||c.playable(o,s))&&!c?.isWater?.(o,s)){i={x:o,z:s,dist:a};break}}return i||(i={x:r.x+t*2.2,z:r.z+n*2.2,dist:2.2}),i}function Ev(e){if(!e?.debug||Fv(e)||!e.progress?.data)return null;let t=e.progress.data;return t.weapon&&t.weapon!==`__debug_blade`?null:(t.crafted={...t.crafted||{}},t.crafted[an]=!0,t.weapon=an,$t(t,{weapon:an}),e.applyGear?.(!1),e.selectSlot?.(0,!0),{id:an,name:`Hunter Blade`})}function Dv(e,t){return!e?.debug||Fv(e)?!1:(e.debug.autoAttack=!!t,!t&&e.debug&&(e.debug.autoLock=null),e.debug.autoAttack)}function Ov(e,t,n){let r=Math.min(X_,Math.max(0,Number(t)||0)),i=Number(n);if(Number.isFinite(i)){let t=Number(e.debug.autoAtkNow);if(e.debug.autoAtkNow=i,Number.isFinite(t)){let e=(i-t)/1e3;e>r&&e>=0&&(r=Math.min(X_,e))}}return r}function kv(e){if(!e?.debug?.autoAttack||Fv(e))return null;let t=e.player;if(!t||t.dead)return null;let n=t.pos||t,r=e.carried?.(e.items?.[e.sel])||e.items?.[e.sel]||{},i=(Number(r.reach)||2.6)+2.4,a=i+4,o=e.debug.autoLock;if(o&&!o.dead&&Math.hypot((Number(o.x)||0)-n.x,(Number(o.z)||0)-n.z)<=a)return o;let s=null,c=i;for(let t of e.monsters||[]){if(!t||t.dead||!t.debugTank&&!xv(t.type))continue;let e=Math.hypot(t.x-n.x,t.z-n.z);e<c&&(c=e,s=t)}return e.debug.autoLock=s||null,e.debug.autoLock}function Av(e,t=0,n=void 0){if(!e?.debug?.autoAttack||Fv(e)||e.uiBlocking||!e.started)return!1;let r=e.player;if(!r||r.dead)return!1;let i=Ov(e,t,n);if(i>0&&(e.debug.autoAtkCd=Math.max(0,Number(e.debug.autoAtkCd)||0)-i),r.state===`attack`||r.state===`roll`||r.state===`stagger`||r.state===`use`||i>0&&e.debug.autoAtkCd>0)return!1;let a=kv(e);if(!a||a.dead)return!1;let o=r.pos||r,s=Math.hypot(a.x-o.x,a.z-o.z)||1;r.yaw=Math.atan2((a.x-o.x)/s,(a.z-o.z)/s);let c=r.stamina;e.debug.facingLock=!0;try{e.doAttack?.()}finally{e.debug.facingLock=!1}return r.stamina!=null&&c!=null&&(r.stamina=c),i>0&&(e.debug.autoAtkCd=Y_),!0}function jv(e){let t=Math.round(Math.max(1,Number(e)||18)*8);return Math.min(t,160)}function Mv(e){return e?`${Math.max(0,Math.round(Number(e.hp)||0))}/${Math.max(1,Math.round(Number(e.maxHp)||1))}`:``}function Nv(e,t){if(!t?.debugTank||!e)return!1;let n=Number(t.x)||0,r=Number(t.z)||0,i=Number(e.player?.pos?.x??e.player?.x??n),a=Number(e.player?.pos?.z??e.player?.z??r),o=n-i,s=r-a,c=Math.hypot(o,s);c<.2?(o=1.6,s=.4):(o=o/c*1.7,s=s/c*1.7);let l=n+o,u=r+s,d=e.world?.heightAt?.(l,u),f=(Number.isFinite(d)?d:Number(t.y)||0)+.62;return e.dropCoin?.(n,(Number(t.y)||0)+.6,r,4),e.dropLootBag?.(l,f,u,{session:!0,gold:6,label:`Loot bag`,pickupAfter:Q_,magnetAfter:Q_,item:Wt}),!0}var Pv=`debug`;function Fv(e,t){return e?.mmo||e?.worldView?!0:sv(t??(typeof location<`u`?location.search:``)).blocked}function Iv(){return{ok:!1,code:Pv,message:`Debug tools are offline only.`}}function Lv(e){if(!e)return e;let t=jv(Math.max(1,Number(e.maxHp||e.hp||18)));e.maxHp=t,e.hp=t,e.debugTank=!0,e.debugSpawn=!0,e.puppet=!1;let n=e.def||{};return e.def={...n,aggro:Math.max(Number(n.aggro)||0,12),dmg:Math.max(1,Math.min(Number(n.dmg)||2,2)),gold:n.gold||[3,6]},e.state=`chase`,e.cd=.2,e.tankCd=.25,e.hitCd=0,e.name=`${String(e.name||`Monster`).replace(/ \(tank\)$/i,``)} (tank)`,e}function Rv(e,t=1/60){if(!e?.debug||Fv(e))return 0;let n=e.player;if(!n||n.dead)return 0;let r=0;for(let i of e.monsters||[]){if(!i?.debugTank||i.dead)continue;i.state!==`idle`&&i.state!==`wander`&&i.state||(i.state=`chase`);let a=n.pos?.x??n.x,o=n.pos?.z??n.z,s=Math.hypot((a??0)-i.x,(o??0)-i.z);if(s>(Number(i.def?.aggro)||12)||(i.tankCd=(Number(i.tankCd)||0)-t,s>2.8)||i.tankCd>0)continue;i.tankCd=Z_;let c=Math.max(1,Number(i.def?.dmg)||2);typeof n.hurt==`function`?n.hurt(c,i.x,i.z,e.debug?.autoAttack?0:4):n.hp!=null&&(n.hp=Math.max(0,Number(n.hp)-c)),r+=1}return r}function zv(e,t,n={}){if(Fv(e,t))return Iv();if(!e?.debug||!e.spawner?.spawn||!e.player?.pos)return null;Ev(e);let r=Cv(e)||`slime`,i=xv(r)?r:`slime`,a=Tv(e),o=e.spawner.spawn(i,a.x,a.z,!0);return n.tank&&Lv(o),o&&(o.debugSpawn=!0),e.cam&&(e.cam.pitch=Math.max(Number(e.cam.pitch)||0,.92)),e.hud?.toast?.(`DEBUG · ${o?.name||i}`,1800),o}function Bv(e){e._debugSpawnBound||(e._debugSpawnBound=!0,e.debugSpawn=t=>zv(e,void 0,t),e.debugSpawnTank=()=>zv(e,void 0,{tank:!0}),window.addEventListener(`keydown`,t=>{if(t.code!==`F9`||t.repeat||!e.debug||Fv(e))return;let n=t.target?.tagName;n!==`INPUT`&&n!==`TEXTAREA`&&(t.preventDefault(),zv(e,void 0,{tank:!!t.shiftKey}))}))}function Vv(e,t){if(Fv(e))return null;let n=pv(t,e?.world);if(!n||!e?.player?.pos)return!n&&String(t||``).trim()&&e?.hud?.toast&&e.hud.toast(`DEBUG · unknown tp "${t}"`,2800),null;e.world&&e.world.realm&&e.world.realm!==`over`&&(e.world.realm=`over`,e.world.group&&(e.world.group.visible=!0),e.world.cave?.group&&(e.world.cave.group.visible=!1),e.world.rift?.group&&(e.world.rift.group.visible=!1),e.sky&&(e.sky.indoors=!1));let r=e.world?.heightAt?.(n.x,n.z)??3.2;if(e.player.pos.set(n.x,r,n.z),e.cam&&(e.cam.lookAhead=0),n.id===`gilantre`&&e.cam&&(e.player.yaw=0,e.cam.targetYaw=0,e.cam.yaw=0,e.cam.pitch=.72,e.cam.targetDist=14,e.cam.dist=14),n.id===`oasis`){let t=Math.atan2(L_.x-n.x,L_.z-n.z);e.player.yaw=t,e.cam&&(e.cam.targetYaw=t+Math.PI,e.cam.yaw=t+Math.PI,e.cam.pitch=B_.pitch,e.cam.targetDist=B_.dist,e.cam.dist=B_.dist,e.cam.lookAhead=B_.lookAhead)}if(n.id===`lagoon`){let t=Math.atan2(V_.x-n.x,V_.z-n.z);e.player.yaw=t,typeof e.forestAmt==`number`&&(e.forestAmt=0),e.cam&&(e.cam.targetYaw=t+Math.PI,e.cam.yaw=t+Math.PI,e.cam.pitch=U_.pitch,e.cam.targetDist=U_.dist,e.cam.dist=U_.dist,e.cam.lookAhead=U_.lookAhead)}if(n.id===`pirateshore`){let t=Math.atan2(q_.x-n.x,q_.z-n.z);e.player.yaw=t,typeof e.forestAmt==`number`&&(e.forestAmt=0),e.cam&&(e.cam.targetYaw=t+Math.PI,e.cam.yaw=t+Math.PI,e.cam.pitch=J_.pitch,e.cam.targetDist=J_.dist,e.cam.dist=J_.dist,e.cam.lookAhead=J_.lookAhead)}e.player.syncObj?.(),e.snapCamera?.();let i=e.viewDistance?.()||e.world?.streamRadius||140;return e.world?.streamAround?e.world.streamAround(n.x,n.z,i,64):e.world?.revealAround?.(n.x,n.z,64),e.hud?.toast?.(`DEBUG · ${n.id}`,2200),n}function Hv(e,t){t.unlock&&(vv(e.progress,e.journal),e.rebindFromProgress?.()),t.tp&&Vv(e,t.tp),Ev(e)}function Uv(e,t){let n=sv(t??(typeof location<`u`?location.search:``));if(e?.mmo||e?.worldView)return(n.enabled||n.blocked)&&console.warn(`[Monster Gate] Debug flags (?debug=1, &tp=, &unlock=1, spawn, F9) are ignored while ?mmo=1 or world-view is present, so the world-view session is not teleported, unlocked, spawned, or badged. World 1 rejects debug messages with error code debug.`),null;if(n.blocked)return console.warn(`[Monster Gate] Debug flags (?debug=1, &tp=, &unlock=1, spawn, F9) are ignored while ?mmo=1 is present, so the world-view session is not teleported, unlocked, spawned, or badged. World 1 rejects debug messages with error code debug.`),null;if(!n.enabled)return null;Yt(!0),e.progress&&(e.progress.sessionOnly=!0),e.debug=n,e.teleportDebug=t=>Vv(e,t),_v();let r=e.start?.bind(e);return r&&!e._debugStartWrapped&&(e._debugStartWrapped=!0,e.start=(...t)=>{r(...t),e.started&&Hv(e,n)}),e.started&&Hv(e,n),typeof window<`u`&&Bv(e),n}var Wv=Math.PI*2;function Gv(e,t){let n=(t-e)%Wv;return n>Math.PI&&(n-=Wv),n<-Math.PI&&(n+=Wv),n}function Kv(e){return e*e*(3-2*e)}function qv(e){return 1+2.70158*(e-1)**3+1.70158*(e-1)**2}var Jv={slime:.6,voidslime:.65,boar:1.3,wraith:.9,budgedragon:1.8,darksycledragon:2.1,volcanum:2.6,orcscout:1.25,snowyeti:2.3,demonknight:2.2,holyknight:2.2,chicken:.65},Yv={boar:16734778,budgedragon:16742954,darksycledragon:11689215,volcanum:16734738,wraith:12745727,orcscout:12868138,snowyeti:8376575,demonknight:16726554,holyknight:7321855},Xv=1,Zv=5.2,Qv=.95,$v=4,ey=.75,ty=[{at:.12,k:`fan`},{at:1,k:`rain`},{at:1.9,k:`gloom`},{at:2.65,k:`fan`},{at:3.2,k:`rain`}],ny=new Set([`ascend`,`air`,`descend`]),ry=[[93,88],[97,91],[101,88],[105,91],[94,94],[99,95],[103,95],[70,96],[64,98],[86,98],[78,106],[56,94]],iy=4,ay={chicken:{name:`Chicken`,hp:8,radius:.42,speed:3.4,dmg:0,gold:[1,2],aggro:0,build:kc},slime:{name:`Gate Slime`,hp:18,radius:.5,speed:2.6,dmg:2,gold:[2,5],aggro:9,build:()=>Tc(`green`)},voidslime:{name:`Void Slime`,hp:26,radius:.55,speed:3,dmg:3,gold:[4,8],aggro:11,build:()=>Tc(`purple`)},boar:{name:`Thorn Boar`,hp:38,radius:.7,speed:2.5,dmg:3,gold:[5,10],aggro:10,build:Ec},wraith:{name:`Gate Wraith`,hp:24,radius:.5,speed:2.2,dmg:2,gold:[6,12],aggro:13,build:Dc},budgedragon:{name:`Green Budge Dragon`,hp:64,radius:.85,speed:3.1,dmg:4,gold:[12,22],aggro:12,build:Oc},darksycledragon:{name:`Darksycle Dragon`,hp:155,radius:1.9,speed:2.7,dmg:5,gold:[30,48],aggro:17,build:il},volcanum:{name:`Volcanum`,hp:2400,radius:2.55,speed:3.15,dmg:12,gold:[700,1100],aggro:30,build:Nl},snowyeti:{name:`Ravenous Snow Yeti`,hp:210,radius:1.2,speed:3,dmg:5,gold:[55,85],aggro:18,build:Zu},demonknight:{name:`Demon Knight`,hp:320,radius:1.05,speed:3.1,dmg:5,gold:[90,140],aggro:14,build:Td},holyknight:{name:`Holy Knight`,hp:300,radius:1.05,speed:3,dmg:5,gold:[90,140],aggro:14,build:Md},keepwarden:{name:`Keep Warden`,hp:420,radius:1.12,speed:3.05,dmg:7,gold:[110,160],aggro:16,build:Td},orcscout:{name:`Orc Scout`,hp:36,radius:.6,speed:2.7,dmg:4,gold:[2,8],aggro:12,build:Cu}};Object.assign(ay,E_);for(let[e,t]of Object.entries(Object.fromEntries([...T_].map(([e,t])=>[e,t.FX[e]]))))t.deathDur&&(Jv[e]=t.deathDur),t.tele&&(Yv[e]=t.tele);var oy=Object.fromEntries(Object.entries(ay).map(([e,t])=>[e,t.build])),sy=Object.fromEntries(Object.entries(ay).map(([e,t])=>[e,{hp:t.hp,dmg:t.dmg,speed:t.speed}])),cy=class{constructor(e,t,n,r){this.game=e,this.type=t;let i=ay[t];this.def=i,this.name=i.name,this.radius=i.radius,this.maxHp=i.hp,this.hp=i.hp,this.x=n,this.z=r,this.home={x:n,z:r},this.y=e.world.heightAt(n,r),this.vx=0,this.vz=0,this.vy=0,this.yaw=Math.random()*Wv,this.state=`idle`,this.t=Math.random()*3,this.cd=1+Math.random(),this.hitCd=0,this.stun=0,this.poisonT=0,this.poisonDps=0,this.burnT=0,this.burnDps=0,this.slowT=0,this.slowMul=1,this.markT=0,this.markAmp=0,this.flash=0,this.dead=!1,this.deadT=0,this.wanderT=0,this.target={x:n,z:r},this.phase=Math.random()*10,this.spawnT=.6,this.id=`m`+Math.random().toString(36).slice(2,8),this.hover=t===`wraith`?1.15:+(t===`darksycledragon`||t===`volcanum`),this.realm=`over`,this.skyCd=3.5+Math.random()*2.5,this.strikes=[],this.airCharge=null,this.airChargeT=0,this.airEv=0,this.orbitDir=Math.random()<.5?-1:1;let a=i.build();this.model=a,this.obj=new V,this.obj.add(a.root),e.scene.add(this.obj),this.obj.position.set(n,this.y,r),this.baseScale=t===`voidslime`?1.15:t===`darksycledragon`?2:t===`volcanum`?2.7:t===`keepwarden`?1.12:1,this.air=!1,this.attacking=!1,this.chargeDir=new jt,this.hitT=0,this.landT=0,this.pend=null,this.pendT=0,this.teleSlot=null,this.teleKind=null,this.kick=0,this.px=n,this.pz=r,this.avx=0,this.avz=0,this.yawRate=0,this.prevYaw=this.yaw,this.stepIdx=0,this.deadSide=Math.random()<.5?-1:1,this.hvy=0,this.deadFlags={},this.flashDir={x:0,z:1}}warn(e,t,n,r,i=!1){let a=this.game;this.teleKind=e,this.teleCenter=i,this.teleSlot=a.fx.telegraph(this.x,this.y+this.hover*.2,this.z,this.yaw,e,t,n,Yv[this.type]||16730682,r),this.teleSlot.owner=this,this.teleL=n}clearWarn(){this.teleSlot&&(this.teleSlot.owner===this&&this.game.fx.cancelTelegraph(this.teleSlot),this.teleSlot=null)}placeWarn(){let e=this.teleSlot;if(!e||e.owner!==this||!e.active||this.teleKind===`dive`)return;let t=e.mesh,n=this.game.world.heightAt(this.x,this.z);this.teleKind===`line`?(t.position.set(this.x+Math.sin(this.yaw)*this.teleL*.5,n+.1,this.z+Math.cos(this.yaw)*this.teleL*.5),t.rotation.y=this.yaw):t.position.set(this.x,n+.1,this.z)}afflict(e,t,n){if(!this.dead){if(e===`poison`)this.poisonT=Math.max(this.poisonT||0,t),this.poisonDps=Math.max(this.poisonDps||0,n);else if(e===`burn`)this.burnT=Math.max(this.burnT||0,t),this.burnDps=Math.max(this.burnDps||0,n);else if(e===`slow`){let e=t>=(this.slowT||0);this.slowT=Math.max(this.slowT||0,t),this.slowMul=e?n:Math.min(this.slowMul||1,n)}else e===`mark`?(this.markT=Math.max(this.markT||0,t),this.markAmp=n):e===`stun`&&(this.stun=Math.max(this.stun||0,t))}}tickStatus(e){if(this.dead)return!1;let t=(t,n,r,i)=>{this[t]<=0||(this[t]=Math.max(0,this[t]-e),this[r]=(this[r]||0)+e,this[r]<.5||(this[r]-=.5,this.hp-=(this[n]||0)*.5,this.game.fx.burst(this.x,this.y+.8+(this.hover||0),this.z,i,3,1.4,.07,.35)))};return t(`poisonT`,`poisonDps`,`_poisAcc`,8257370),this.hp<=0||(t(`burnT`,`burnDps`,`_burnAcc`,16742938),this.hp<=0)?(this.hp=0,this.die(),!0):(this.slowT>0&&(this.slowT=Math.max(0,this.slowT-e)),this.markT>0&&(this.markT=Math.max(0,this.markT-e)),!1)}takeHit(e,t,n,r,i=!1){if(this.dead)return;this.markT>0&&(e=Math.max(1,Math.round(e*(1+(this.markAmp||.4)))));let a=this.game;this.hp-=e,this.flash=.18;let o=this.type===`budgedragon`,s=this.type===`darksycledragon`,c=this.type===`volcanum`,l=s||c,u=this.type===`snowyeti`,d=Oe.has(this.type),f=T_.get(this.type),p=f?f.FX[this.type]:null,m=o||l||u||d||!!p?.heavy;this.stun=f?f.busy(this)?0:p.stun??.2:d?Bd.has(this.state)?0:.1:u?uf.has(this.state)?0:.1:this.type===`boar`&&this.state===`charge`?.05:m?this.state===`windup`||this.state===`breath`||this.state===`bite`||ny.has(this.state)?0:.12:.28,this.state===`windup`&&!m&&(this.state=`chase`,this.clearWarn()),this.pend=null,this.hitT=.34,this.flashDir={x:t,z:n},l&&this.state===`windup`&&e>=(c?28:14)&&this.atk!==`breath`&&(this.state=`recover`,this.t=0,this.cd=1.3,this.clearWarn(),a.fx.ring(this.x,this.y+this.hover+1.2,this.z,16769658,12,3,.1,.4),a.hud.floatText(...a.screenOf(this.x,this.y+this.hover+2.4,this.z),`Staggered`,`gold`)),u&&[`rakewind`,`breathwind`,`hurlwind`].includes(this.state)&&e>=20&&(this.state=`recover`,this.t=0,this.cd=1.2,this.clearWarn(),a.fx.ring(this.x,this.y+2.2,this.z,16769658,12,3,.1,.4),a.hud.floatText(...a.screenOf(this.x,this.y+4.2,this.z),`Staggered`,`gold`));let h=u&&(this.state===`leap`||this.state===`slamwind`),g=r/(p?p.knock??3:this.type===`boar`?1.6:o?2.4:l?3.4:u?5.5:d?6:1);this.vx=h?this.vx:t*g*1.7,this.vz=h?this.vz:n*g*1.7,h||(this.vy=this.type===`wraith`||l||u||d||p?.noLift?0:o?1.2:2.6),o&&!this.enraged&&this.hp>0&&this.hp<this.maxHp*.4&&this.enrage(),(l||u||d||p?.rage)&&!this.enraged&&this.hp>0&&this.hp<this.maxHp*.5&&this.enrage(),this.air=this.type===`slime`||this.type===`voidslime`||h?this.air:!1;let _=this.x,v=this.y+.7+this.hover,y=this.z,b=p?p.spark:this.type===`chicken`?[16775920,16095786]:this.type===`slime`?[10810767,16777215]:this.type===`voidslime`||this.type===`wraith`?[14464255,16777215]:c?[16769162,16734738,16777215]:s?[14201087,16777215]:u?[15137279,10476799,16777215]:this.type===`demonknight`?[16747082,16726554,16777215]:this.type===`holyknight`?[16773296,10473727,16777215]:[16773824,16757575,16777215];a.fx.impact(_-t*this.radius*.6,v+.2,y-n*this.radius*.6,t,n,b,(i?.85:.5)*Math.min(1,.4+e/28)),a.fx.burst(_,v,y,p?p.burst:this.type===`chicken`?[16775920,16095786,14694970,16777215]:this.type===`slime`?[5756012,10810767,16777215]:this.type===`voidslime`||this.type===`wraith`?[12745727,9196250,16777215]:c?[16734738,16769162,1708560]:s?[11689215,4931468,16777215]:u?[11849958,14478584,16777215]:this.type===`demonknight`?[3816002,6974068,16726554]:this.type===`holyknight`?[14672358,16765562,16777215]:[13211258,16734790,16777215],i?6:4,1.15,.05,.28),a.hud.floatText(...a.screenOf(_,v+.9,y),String(e)+(i?`!`:``),i?`crit`:``),(this.state===`idle`||this.state===`wander`||this.state===`peck`)&&this.type!==`chicken`&&(this.state=`chase`),this.hp<=0&&this.die()}applyServerState(e){if((this.realm||`over`)!==`rift`||!e||!Number.isFinite(Number(e.hp)))return;this.serverAuthoritative=!0;let t=this.hp,n=Number(e.maxHp??e.max_hp);if(Number.isFinite(n)&&n>0&&(this.maxHp=n),Number.isFinite(Number(e.x))&&(this.x=Number(e.x)),Number.isFinite(Number(e.y))&&(this.y=Number(e.y)),Number.isFinite(Number(e.z))&&(this.z=Number(e.z)),Number.isFinite(Number(e.yaw))&&(this.yaw=Number(e.yaw)),this.hp=Math.max(0,Math.min(this.maxHp,Number(e.hp))),this.hp<t&&this.hp>0){let e=t-this.hp;this.flash=.14,this.game.hud.floatText(...this.game.screenOf(this.x,this.y+1.6,this.z),String(e)),this.game.audio.hit()}this.hp<=0&&!this.dead?this.die():this.hp>0&&this.dead&&(this.dead=!1,this.deadT=0,this.remove=!1,this.state=`idle`,this.vx=this.vz=this.vy=0,this.obj.visible=!0,this.obj.position.set(this.x,this.game.world.heightAt(this.x,this.z),this.z),this.clearWarn(),this.clearStrikes())}enrage(){let e=this.game;this.enraged=!0,this.cd=Math.min(this.cd,.3);let t=this.type===`darksycledragon`,n=this.type===`volcanum`,r=this.type===`snowyeti`;(t||n)&&(this.skyCd=Math.min(this.skyCd,1.5)),r&&(this.state=`roar`,this.t=0,this.roarBlast=!1,this.clearWarn(),e.shake(.3));let i=Oe.has(this.type),a=D_(this.type);e.audio.tone(t?160:n?70:90,.55,`sawtooth`,.16,-30),e.fx.ring(this.x,this.y+.3+this.hover,this.z,a?a.tele:n?16734738:t?11689215:r?8376575:this.type===`holyknight`?7321855:this.type===`demonknight`?16726554:16738858,10,2.6,.1,.5),e.hud.floatText(...e.screenOf(this.x,this.y+this.hover+(a?a.plateY:r?4.3:i?3.8:n?4.2:2.2),this.z),a?.rageText||(n?`The mountain wakes!`:t?`Dusk Frenzy!`:r?`Ravenous Frenzy!`:i?`The Eternal War!`:`Enraged!`),`crit`)}die(){let e=this.game;this.dead=!0,this.deadT=0,e.onMonsterKilled(this,{serverAuthoritative:!!this.serverAuthoritative}),e.fx.burst(this.x,this.y+.7+this.hover,this.z,D_(this.type)?D_(this.type).death:this.type===`boar`?[13211258,9066036,16777215]:this.type===`budgedragon`?[7328858,15853254,16777215]:this.type===`volcanum`?[16734738,16769162,1708560]:this.type===`darksycledragon`?[11689215,14210030,2827344]:this.type===`snowyeti`?[11849958,15137279,8376575,16777215]:this.type===`demonknight`?[3816002,16726554,16747050,16777215]:this.type===`holyknight`?[14672358,16765562,7321855,16777215]:[12745727,5756012,16777215],22,4.5,.14,.8),e.audio.pop(),e.hud.removePlate(this.id),this.clearWarn(),this.clearStrikes(),this.pend=null,this.state=`dead`,this.vy=Math.max(this.vy,this.type===`slime`||this.type===`voidslime`?3.5:1.5),e.fx.impact(this.x,this.y+.9+this.hover,this.z,this.flashDir.x,this.flashDir.z,[16777215,16773824],2.2),this.type===`budgedragon`||this.type===`darksycledragon`||this.type===`volcanum`||this.type===`snowyeti`||Oe.has(this.type)||D_(this.type)?.slowmo?(e.slowmo(.55,.3),e.shake(.35),e.punch(.5)):this.type===`boar`&&(e.slowmo(.3,.4),e.punch(.25))}clearStrikes(){for(let e of this.strikes)this.game.fx.cancelTelegraph(e.slot);this.strikes.length=0}beginFlight(){let e=this.game;this.state=`ascend`,this.t=0,this.airEv=0,this.airCharge=null,this.orbitDir=Math.random()<.5?-1:1,this.clearWarn();let t=this.type===`volcanum`;e.audio.tone(t?80:140,.55,`sawtooth`,.12,140),e.fx.ring(this.x,this.y+.3,this.z,t?16734738:11689215,18,5,.1,.5),e.fx.shockwave(this.x,this.y,this.z,t?16747044:12166880,2.6),e.shake(.25),e.hud.floatText(...e.screenOf(this.x,this.y+this.hover+2.4,this.z),t?`The mountain rises!`:`Takes flight!`,`gold`)}beginDescend(e){let t=this.game;this.state=`descend`,this.t=0,this.airCharge=null;let n=e.pos.x,r=e.pos.z;this.dive={x:n,z:r};let i=t.world.heightAt(n,r);this.teleSlot=t.fx.telegraph(n,i,r,0,`circle`,8.8,0,this.type===`volcanum`?16734738:11689215,ey),this.teleSlot.owner=this,this.teleKind=`dive`,t.audio.tone(380,ey,`sawtooth`,.1,-280)}slam(e){let t=this.game;this.hover=Xv,this.clearWarn();let n=this.type===`volcanum`;t.fx.shockwave(this.x,this.y,this.z,n?16747044:12166880,3),t.fx.ring(this.x,this.y+.3,this.z,n?16734738:11689215,24,6,.12,.55),t.vfx.glow(this.x,this.y+.6,this.z,n?16734738:11689215,5,.35,{grow:.8,gain:.8}),t.shake(.45),t.punch(.3),t.audio.tone(90,.35,`square`,.14,-40),Math.hypot(e.pos.x-this.x,e.pos.z-this.z)<8.8&&e.pos.y<this.y+2.4&&e.hurt(this.def.dmg+(n?6:2),this.x,this.z,18)&&t.fx.burst(e.pos.x,e.pos.y+1,e.pos.z,n?[16769162,16734738]:[14210030,11689215],8,3,.09,.35),this.state=`recover`,this.t=-.45,this.cd=1.1,this.skyCd=(this.enraged?7:11)+Math.random()*4}airFire(e,t,n){let r=this.game,i=!!this.enraged,a=Math.atan2(t.pos.x-this.x,t.pos.z-this.z),o=this.x+Math.sin(a)*4.4,s=this.z+Math.cos(a)*4.4,c=this.y+this.hover+3.2,l=e=>z((t.pos.y+1-c)/Math.max(.5,Math.max(n-1.5,1)/e),-9,9);if(e===`fan`){let e=i?[-.4,-.2,0,.2,.4]:[-.26,0,.26];for(let t of e)r.spawnProjectile({owner:`enemy`,kind:`crescent`,x:o,y:c,z:s,vx:Math.sin(a+t)*9.5,vz:Math.cos(a+t)*9.5,vy:l(9.5),dmg:this.def.dmg,life:2.2,r:.5});r.fx.burst(o,c,s,[11689215,14210030,16777215],10,3.2,.1,.4),r.audio.tone(520,.16,`sawtooth`,.09,-300)}else if(e===`gloom`)r.spawnProjectile({owner:`enemy`,kind:`gloom`,x:o,y:c,z:s,vx:Math.sin(a)*5.4,vz:Math.cos(a)*5.4,vy:l(5.4),dmg:this.def.dmg+2,life:4.4,r:.55,homing:2.4}),r.fx.ring(o,c,s,11689215,8,1.8,.08,.4),r.audio.tone(210,.3,`sine`,.12,120);else{let e=i?4:3;for(let n=0;n<e;n++){let e=n===0?0:(n%2?1:-1)*(2.6+Math.floor((n-1)/2)*1.6),i=t.pos.x+Math.cos(a)*e+(Math.random()-.5)*.8,o=t.pos.z-Math.sin(a)*e+(Math.random()-.5)*.8,s=r.world.heightAt(i,o),c=.95+n*.12,l=r.fx.telegraph(i,s,o,0,`circle`,2.1,0,8019199,c);this.strikes.push({x:i,z:o,gy:s,t:0,dur:c,slot:l,r:2.1})}r.fx.burst(o,c,s,[8019199,10147071,16777215],12,3,.1,.4),r.audio.tone(260,.3,`triangle`,.1,200)}this.kick=1}tickStrikes(e,t){if(!this.strikes.length)return;let n=this.game;for(let r=this.strikes.length-1;r>=0;r--){let i=this.strikes[r];i.t+=e;let a=(1-z(i.t/i.dur,0,1))*7;for(let e=0;e<2;e++)n.fx.emit(i.x+(Math.random()-.5)*.35,i.gy+a+e*.5,i.z+(Math.random()-.5)*.35,0,-9,0,e?10147071:8019199,.14,.18,0);i.t<i.dur||(this.strikes.splice(r,1),n.fx.shockwave(i.x,i.gy,i.z,10128639,1.8),n.fx.ring(i.x,i.gy+.2,i.z,8019199,16,4.2,.1,.45),n.fx.burst(i.x,i.gy+.4,i.z,[8019199,10147071,16777215],12,3.2,.1,.5),n.vfx.glow(i.x,i.gy+.8,i.z,8019199,3.2,.3,{grow:.7,gain:.8}),n.shake(.12),n.audio.tone(150,.18,`square`,.08,-60),!t.dead&&Math.hypot(t.pos.x-i.x,t.pos.z-i.z)<i.r+.2&&t.pos.y<i.gy+1.4&&t.hurt(this.def.dmg,i.x,i.z,14)&&n.fx.burst(t.pos.x,t.pos.y+1,t.pos.z,[14210030,8019199],8,3,.09,.35))}}groundOk(e,t){let n=this.game.world;if(!n.playable(e,t))return!1;let r=n.heightAt(e,t);if(r-this.y>1.01||r<.35-.1||r>9)return!1;let i=n.zoneAt(e,t);return!(i===Xa.TOWN||i===Xa.MINE||n.onDock(e,t,.4))}moveBy(e,t){let n=this.x+e,r=this.z+t;this.groundOk(n,r)?(this.x=n,this.z=r):this.groundOk(n,this.z)?this.x=n:this.groundOk(this.x,r)&&(this.z=r);let i={x:this.x,z:this.z};this.game.world.resolve(i,this.radius*.8),this.x=i.x,this.z=i.z}hunter(){let e=this.game,t=e.player;if(e.net?.role!==`host`||!e.remotes?.size)return t;let n=null,r=Math.hypot(t.pos.x-this.x,t.pos.z-this.z);for(let t of e.remotes.values()){if(t.dead||!t.ready)continue;let e=Math.hypot(t.x-this.x,t.z-this.z);e<r&&(r=e,n=t)}return n?{pos:n,dead:!1,invuln:0,hurt:(t,r,i,a)=>(e.net.sendHurt(n.id,t,r,i,a||6),!0)}:t}snap(e){if(this.x=e.x,this.y=e.y,this.z=e.z,this.yaw=e.yaw,e.state&&(this.state=e.state),e.hp<this.hp){let t=this.hp-e.hp;this.flash=.12;let n=this.game;n.hud.floatText(...n.screenOf(this.x,this.y+1.6,this.z),String(t)),n.audio.hit()}this.hp=e.hp,this.hp<=0&&!this.dead&&this.die()}update(e){let t=this.game;if((this.realm||`over`)!==(t.world?.realm||`over`)){this.obj.visible=!1,this.dead&&this.deadAnim(e);return}if(this.obj.visible=!0,this.dead){this.deadAnim(e);return}if(this.serverAuthoritative&&(this.realm||`over`)!==`rift`&&(this.serverAuthoritative=!1,this.serverId=null),this.serverAuthoritative){let e=t.mmo?.entities?.monsters?.find(e=>e.id===this.serverId);e&&(this.x=e.x,this.y=e.y,this.z=e.z,this.yaw=e.yaw??this.yaw,this.hp=e.hp,this.obj.position.set(this.x,this.y,this.z),this.obj.rotation.y=this.yaw)}if(this.puppet){if(this.t+=e,this.flash=Math.max(0,this.flash-e),this.hitT=Math.max(0,this.hitT-e),this.kick=Math.max(0,this.kick-e*4.5),this.type===`darksycledragon`||this.type===`volcanum`){let t=this.state===`ascend`||this.state===`air`,n=t?this.type===`volcanum`?6.6:Zv:Xv;this.hover+=(n-this.hover)*Math.min(1,e*(t?3:5))}this.animate(e,99);return}let n=this.hunter();if(this.t+=e,this.cd-=e,this.stun=Math.max(0,this.stun-e),this.flash=Math.max(0,this.flash-e),this.spawnT=Math.max(0,this.spawnT-e),this.hitT=Math.max(0,this.hitT-e),this.landT=Math.max(0,this.landT-e),this.kick=Math.max(0,this.kick-e*4.5),!this.serverAuthoritative&&this.tickStatus(e))return;bc(t,this,e),this.pend&&this.stun<=0&&(this.pendT-=e,this.pendT<=0&&this.launchHop());let r=n.pos.x-this.x,i=n.pos.z-this.z,a=Math.hypot(r,i),o=a<this.def.aggro&&!n.dead,s=Math.atan2(r,i),c=0,l=0;if(this.stun<=0)switch(this.type){case`slime`:case`voidslime`:if(this.state===`idle`||this.state===`wander`){if(o)this.state=`chase`;else if(!this.air&&this.cd<=0){this.cd=1.3+Math.random()*1.6;let e=Math.random()*Wv,t=this.home.x+Math.cos(e)*3,n=this.home.z+Math.sin(e)*3;this.hopTo(t-this.x,n-this.z,1.4)}}else this.state===`chase`&&(!o&&a>this.def.aggro*1.6&&(this.state=`idle`),!this.air&&this.cd<=0&&(this.cd=.85,this.hopTo(r,i,this.def.speed*.8),this.yaw=s));this.air&&a<this.radius+.55&&n.invuln<=0&&this.hitCd<=0&&this.contact(n);break;case`boar`:if(this.state===`idle`||this.state===`wander`){if(o)this.state=`chase`;else{if(this.wanderT-=e,this.wanderT<=0){this.wanderT=2+Math.random()*3;let e=Math.random()*Wv;this.target={x:this.home.x+Math.cos(e)*4,z:this.home.z+Math.sin(e)*4}}let t=this.target.x-this.x,n=this.target.z-this.z,r=Math.hypot(t,n);r>.6&&(c=t/r*1,l=n/r*1,this.yaw+=Gv(this.yaw,Math.atan2(t,n))*Math.min(1,e*5))}}else this.state===`chase`?(!o&&a>this.def.aggro*1.5&&(this.state=`idle`),this.yaw+=Gv(this.yaw,s)*Math.min(1,e*6),a>1.8&&(c=r/a*this.def.speed,l=i/a*this.def.speed),(a<6.5&&a>2.6&&this.cd<=0||a<1.7&&this.cd<=0)&&(this.state=`windup`,this.t=0,this.chargeDir.set(r/a,0,i/a),this.warn(`line`,1.5,6.8,.65),t.audio.tone(110,.3,`sawtooth`,.07,-20))):this.state===`windup`?(this.yaw+=Gv(this.yaw,s)*Math.min(1,e*8),this.chargeDir.set(r/(a||1),0,i/(a||1)),this.t>.65&&(this.state=`charge`,this.t=0,this.hitDone=!1,this.clearWarn(),this.kick=1,t.fx.dust(this.x,this.y,this.z,8,2),t.audio.tone(140,.25,`sawtooth`,.12,60))):this.state===`charge`?(c=this.chargeDir.x*9.5,l=this.chargeDir.z*9.5,this.yaw=Math.atan2(this.chargeDir.x,this.chargeDir.z),Math.random()<e*45&&t.fx.dust(this.x-this.chargeDir.x*.6,this.y,this.z-this.chargeDir.z*.6,1,1.4),!this.hitDone&&a<this.radius+.5&&(this.hitDone=!0,n.hurt(this.def.dmg,this.x,this.z,8)&&(this.state=`recover`,this.t=0,t.fx.shockwave(this.x,this.y,this.z,14272928,1.2))),this.t>.7&&(this.state=`recover`,this.t=0,t.fx.dust(this.x,this.y,this.z,8,2.2))):this.state===`recover`&&this.t>1&&(this.state=`chase`,this.cd=1.8);break;case`wraith`:if(this.state===`idle`||this.state===`wander`){if(o)this.state=`chase`;else{if(this.wanderT-=e,this.wanderT<=0){this.wanderT=2+Math.random()*2;let e=Math.random()*Wv;this.target={x:this.home.x+Math.cos(e)*3,z:this.home.z+Math.sin(e)*3}}let t=this.target.x-this.x,n=this.target.z-this.z,r=Math.hypot(t,n);r>.5&&(c=t/r*.8,l=n/r*.8)}}else if(this.state===`chase`){this.yaw+=Gv(this.yaw,s)*Math.min(1,e*6);let t=a<4.2?-1:+(a>6.7),n=Math.cos(this.t*.8+this.phase)*.5;c=r/a*this.def.speed*t+i/a*n*2,l=i/a*this.def.speed*t-r/a*n*2,!o&&a>this.def.aggro*1.5&&(this.state=`idle`),this.cd<=0&&a<11&&(this.state=`windup`,this.t=0,this.warn(`line`,1.1,9,.7))}else if(this.state===`windup`&&(this.yaw+=Gv(this.yaw,s)*Math.min(1,e*10),this.t>.7)){this.clearWarn(),this.kick=1;let e=Math.atan2(r,i);t.spawnProjectile({owner:`enemy`,kind:`orb`,x:this.x+Math.sin(e)*.6,y:this.y+1.5,z:this.z+Math.cos(e)*.6,vx:Math.sin(e)*6.5,vz:Math.cos(e)*6.5,dmg:this.def.dmg,life:3.2,r:.4}),t.audio.tone(300,.2,`sawtooth`,.08,-150),this.state=`chase`,this.cd=2.2+Math.random()}break;case`budgedragon`:{let u=this.enraged?1.3:1;if(this.state===`idle`||this.state===`wander`){if(o)this.state=`chase`,this.cd=.5,t.audio.tone(130,.4,`sawtooth`,.1,-50);else{if(this.wanderT-=e,this.wanderT<=0){this.wanderT=2.5+Math.random()*3;let e=Math.random()*Wv;this.target={x:this.home.x+Math.cos(e)*4,z:this.home.z+Math.sin(e)*4}}let t=this.target.x-this.x,n=this.target.z-this.z,r=Math.hypot(t,n);r>.7&&(c=t/r*.9,l=n/r*.9,this.yaw+=Gv(this.yaw,Math.atan2(t,n))*Math.min(1,e*4))}}else if(this.state===`chase`){!o&&a>this.def.aggro*1.6&&(this.state=`idle`),this.yaw+=Gv(this.yaw,s)*Math.min(1,e*7);let t=a>4.5&&a<10&&Math.random()<e*.55;a>1.9&&(c=r/a*this.def.speed*u,l=i/a*this.def.speed*u),this.cd<=0&&a<2.4?(this.state=`windup`,this.atk=`bite`,this.t=0,this.warn(`line`,1.7,2.9,.34/u)):this.cd<=0&&t&&(this.state=`windup`,this.atk=`spit`,this.t=0,this.warn(`line`,2.4,9,.75/u))}else if(this.state===`windup`){this.yaw+=Gv(this.yaw,s)*Math.min(1,e*9);let n=this.atk===`spit`?.75:.34;if(this.t>n/u){if(this.clearWarn(),this.kick=1,this.atk===`spit`){let e=Math.atan2(r,i);for(let n of[-.16,0,.16])t.spawnProjectile({owner:`enemy`,kind:`ember`,x:this.x+Math.sin(e)*1.4,y:this.y+1.05,z:this.z+Math.cos(e)*1.4,vx:Math.sin(e+n)*8,vz:Math.cos(e+n)*8,dmg:this.def.dmg-1,life:1.5,r:.38});t.fx.burst(this.x+Math.sin(e)*1.4,this.y+1.05,this.z+Math.cos(e)*1.4,[16751146,16769658,16777215],10,3,.1,.4),t.audio.tone(220,.25,`sawtooth`,.09,-120),this.state=`recover`,this.t=0,this.cd=1.6/u}else this.state=`bite`,this.t=0,t.vfx.slashArc(this.x,this.y+.95,this.z,Math.atan2(r,i),{radius:1.9,thick:1,sweep:1.9,color:16773328,hot:16777215,tilt:.5,life:.22,sweepT:.1,forward:0}),t.vfx.glow(this.x+Math.sin(this.yaw)*1.5,this.y+1,this.z+Math.cos(this.yaw)*1.5,16738906,2.2,.2,{grow:.5}),this.hitDone=!1,this.chargeDir.set(r/(a||1),0,i/(a||1)),this.vx=this.chargeDir.x*7.5,this.vz=this.chargeDir.z*7.5,t.audio.tone(180,.15,`square`,.1,-90)}}else this.state===`bite`?(!this.hitDone&&a<this.radius+1&&(this.hitDone=!0,n.hurt(this.def.dmg,this.x,this.z,7)&&t.fx.burst(this.x,this.y+.9,this.z,[16775394,16731482],6,2.5,.08,.3)),this.t>.3&&(this.state=`recover`,this.t=0,this.cd=(this.hitDone?.7:.45)/u)):this.state===`recover`&&this.t>.45/u&&(this.state=`chase`);this.enraged&&Math.random()<e*6&&t.fx.burst(this.x+Math.sin(this.yaw)*1.5,this.y+1,this.z+Math.cos(this.yaw)*1.5,[10132122,6974058],1,.8,.12,.6,-.6,.5);break}case`volcanum`:[c,l]=Yl(this,e,{g:t,P:n,dx:r,dz:i,dist:a,sees:o,toP:s});break;case`darksycledragon`:{let u=!!this.enraged;if(this.skyCd-=e,this.tickStrikes(e,n),!ny.has(this.state)&&Math.abs(this.hover-Xv)>.01&&(this.hover+=(Xv-this.hover)*Math.min(1,e*10)),this.state===`idle`||this.state===`wander`){if(o)this.state=`chase`,this.cd=.7,t.audio.tone(170,.45,`sawtooth`,.1,-60);else{if(this.wanderT-=e,this.wanderT<=0){this.wanderT=2.5+Math.random()*3;let e=Math.random()*Wv;this.target={x:this.home.x+Math.cos(e)*5,z:this.home.z+Math.sin(e)*5}}let t=this.target.x-this.x,n=this.target.z-this.z,r=Math.hypot(t,n);r>.7&&(c=t/r*.9,l=n/r*.9,this.yaw+=Gv(this.yaw,Math.atan2(t,n))*Math.min(1,e*3))}}else if(this.state===`chase`){!o&&a>this.def.aggro*1.6&&(this.state=`idle`),this.yaw+=Gv(this.yaw,s)*Math.min(1,e*6);let t=a<6?-1:+(a>11),n=Math.sin(this.t*.7+this.phase),d=this.def.speed*(u?1.25:1);if(c=r/a*d*t*(t<0?1.25:1)+i/a*n*d*.75,l=i/a*d*t*(t<0?1.25:1)-r/a*n*d*.75,this.cd<=.2&&this.skyCd<=0&&o&&a<16)this.beginFlight();else if(this.cd<=0&&o&&(this.atk=a<7.2?`slash`:a<16?Math.random()<(u?.45:.3)?`gloom`:`sickle`:null,this.atk)){this.state=`windup`,this.t=0;let e={slash:.38,sickle:.65,gloom:.95}[this.atk]/(u?1.25:1);this.atk===`slash`?this.warn(`circle`,9.6,0,e,!0):this.atk===`sickle`?this.warn(`line`,u?4.2:2.6,13,e):this.warn(`line`,1.3,10,e)}}else if(this.state===`windup`){this.yaw+=Gv(this.yaw,s)*Math.min(1,e*9),c=-(r/a)*.6,l=-(i/a)*.6;let o={slash:.38,sickle:.65,gloom:.95}[this.atk]/(u?1.25:1);if(this.t>o){this.clearWarn(),this.kick=1;let e=Math.atan2(r,i),o=this.x+Math.sin(e)*4.4,s=this.z+Math.cos(e)*4.4,c=this.y+this.hover+3.2,l=e=>z((n.pos.y+1-c)/Math.max(.5,a/e),-5,5);if(this.atk===`sickle`){let n=u?[-.4,-.2,0,.2,.4]:[-.24,0,.24];for(let r of n)t.spawnProjectile({owner:`enemy`,kind:`crescent`,x:o,y:c,z:s,vx:Math.sin(e+r)*9.5,vz:Math.cos(e+r)*9.5,vy:l(9.5),dmg:this.def.dmg,life:2.2,r:.5});t.fx.burst(o,c,s,[11689215,14210030,16777215],10,3.2,.1,.4),t.audio.tone(520,.16,`sawtooth`,.09,-300),this.cd=(1.7+Math.random()*.5)*(u?.7:1)}else this.atk===`gloom`?(t.spawnProjectile({owner:`enemy`,kind:`gloom`,x:o,y:c,z:s,vx:Math.sin(e)*5.4,vz:Math.cos(e)*5.4,vy:l(5.4),dmg:this.def.dmg+2,life:4.2,r:.55,homing:2.4}),t.fx.ring(o,c,s,11689215,6,1.6,.08,.4),t.audio.tone(210,.3,`sine`,.12,120),this.cd=(2.4+Math.random()*.7)*(u?.7:1)):(a<9.6&&n.hurt(this.def.dmg+2,this.x,this.z,16)&&t.fx.burst(n.pos.x,n.pos.y+1,n.pos.z,[14210030,11689215],8,3,.09,.35),t.fx.ring(this.x,this.y+this.hover-.2,this.z,11689215,14,8.4,.1,.4),t.vfx.slashArc(this.x,this.y+this.hover+1.8,this.z,e,{radius:6.8,thick:2.4,sweep:5.8,color:11689215,hot:15786239,life:.4,sweepT:.22,tail:.95,follow:()=>({x:this.x,y:this.y+this.hover,z:this.z})}),t.vfx.glow(this.x,this.y+this.hover+.9,this.z,11689215,4,.3,{grow:.6,gain:.7}),t.fx.dust(this.x,this.y,this.z,6,2.4,12166880),this.vx=-(r/a)*9,this.vz=-(i/a)*9,t.audio.tone(300,.14,`square`,.09,-160),this.cd=.9);this.state=`recover`,this.t=0}}else if(this.state===`recover`)c=-(r/a)*.8,l=-(i/a)*.8,this.t>.5&&(this.state=`chase`);else if(this.state===`ascend`)this.yaw+=Gv(this.yaw,s)*Math.min(1,e*6),this.hover=Xv+4.2*Kv(z(this.t/Qv,0,1)),c=-(r/a)*1.2,l=-(i/a)*1.2,Math.random()<e*45&&t.fx.dust(this.x+(Math.random()-.5)*2,this.y,this.z+(Math.random()-.5)*2,1,2.2,12166880),this.t>=Qv&&(this.state=`air`,this.t=0,this.airEv=0);else if(this.state===`air`){this.hover=Zv,this.yaw+=Gv(this.yaw,s)*Math.min(1,e*8);let t=a<6?-1:+(a>10.5),o=this.def.speed*(u?1.35:1.15);c=r/a*o*t+i/a*o*.85*this.orbitDir,l=i/a*o*t-r/a*o*.85*this.orbitDir;let d=ty[this.airEv];d&&!this.airCharge&&this.t>=d.at&&(this.airCharge=d.k,this.airChargeT=0),this.airCharge&&(this.airChargeT+=e,this.airChargeT>=.38&&(this.airFire(this.airCharge,n,a),this.airCharge=null,this.airEv++)),this.t>=$v&&!this.airCharge&&this.beginDescend(n)}else if(this.state===`descend`){let t=this.dive;this.yaw+=Gv(this.yaw,Math.atan2(t.x-this.x,t.z-this.z))*Math.min(1,e*8);let r=z(this.t/ey,0,1);this.hover=Zv+-4.2*r*r;let i=Math.min(1,e*4.5);this.moveBy((t.x-this.x)*i,(t.z-this.z)*i),this.t>=ey&&this.slam(n)}u&&Math.random()<e*5&&t.fx.burst(this.x,this.y+this.hover+.9,this.z,[11689215,2827344],1,.8,.12,.7,-.5,.5);break}case`snowyeti`:[c,l]=Of(this,e,{g:t,P:n,dx:r,dz:i,dist:a,sees:o,toP:s});break;case`demonknight`:case`holyknight`:case`keepwarden`:[c,l]=Qd(this,e,{g:t,P:n,dx:r,dz:i,dist:a,sees:o,toP:s});break;case`orcscout`:{let u=Math.hypot(this.x-this.home.x,this.z-this.home.z)>18;if(this.state===`idle`||this.state===`wander`){if(o&&!u)this.state=`chase`;else{if(this.wanderT-=e,this.wanderT<=0){this.wanderT=2+Math.random()*2.4;let e=Math.random()*Wv,t=2+Math.random()*7;this.target={x:this.home.x+Math.cos(e)*t,z:this.home.z+Math.sin(e)*t}}let t=this.target.x-this.x,n=this.target.z-this.z,r=Math.hypot(t,n);r>.6&&(c=t/r*1.05,l=n/r*1.05,this.yaw+=Gv(this.yaw,Math.atan2(t,n))*Math.min(1,e*5))}}else this.state===`chase`?((!o&&a>this.def.aggro*1.4||u)&&(this.state=`idle`),this.yaw+=Gv(this.yaw,s)*Math.min(1,e*7),a>1.65&&(c=r/a*this.def.speed,l=i/a*this.def.speed),a<2.35&&this.cd<=0&&(this.state=`windup`,this.t=0,this.warn(`line`,1.2,2.6,.42),t.audio.tone(90,.18,`sawtooth`,.08,-40))):this.state===`windup`?(this.yaw+=Gv(this.yaw,s)*Math.min(1,e*8),this.t>.42&&(this.clearWarn(),this.state=`bite`,this.t=0,this.hitDone=!1,this.kick=1,t.audio.tone(70,.16,`square`,.1,-20))):this.state===`bite`?(!this.hitDone&&this.t>.1&&this.t<.22&&a<this.radius+1.15&&(this.hitDone=!0,n.hurt(this.def.dmg,this.x,this.z,5),t.fx.burst(this.x+Math.sin(this.yaw)*.8,this.y+1.1,this.z+Math.cos(this.yaw)*.8,[14014686,6986312,16777215],8,2.4,.08,.35)),this.t>.48&&(this.state=`recover`,this.t=0)):this.state===`recover`&&this.t>.42&&(this.state=`chase`,this.cd=.85+Math.random()*.4);break}case`chicken`:if(a<3.6&&!n.dead){this.state=`flee`;let t=Math.max(.2,a);c=-r/t*3.6,l=-i/t*3.6,this.yaw+=Gv(this.yaw,Math.atan2(-r,-i))*Math.min(1,e*10)}else{if(this.wanderT-=e,this.wanderT<=0){if(this.wanderT=1.1+Math.random()*2.4,Math.random()<.5)this.state=`peck`;else if(this.state=`wander`,this.pen)this.target={x:this.pen.cx+(Math.random()-.5)*this.pen.hx*1.6,z:this.pen.cz+(Math.random()-.5)*this.pen.hz*1.6};else{let e=Math.random()*Wv,t=1.2+Math.random()*2.4;this.target={x:this.home.x+Math.cos(e)*t,z:this.home.z+Math.sin(e)*t}}}if(this.state!==`peck`&&this.target){let t=this.target.x-this.x,n=this.target.z-this.z,r=Math.hypot(t,n);r>.3&&(c=t/r*.95,l=n/r*.95,this.yaw+=Gv(this.yaw,Math.atan2(t,n))*Math.min(1,e*7))}}if(this.pen){let e=this.x-this.pen.cx,t=this.z-this.pen.cz;Math.abs(e)>this.pen.hx&&(c=-Math.sign(e)*2.2),Math.abs(t)>this.pen.hz&&(l=-Math.sign(t)*2.2)}else{let e=this.home.x-this.x,t=this.home.z-this.z,n=Math.hypot(e,t);n>6&&(c=e/n*2.4,l=t/n*2.4)}break;default:{let u=T_.get(this.type);u&&([c,l]=u.think(this,e,{g:t,P:n,dx:r,dz:i,dist:a,sees:o,toP:s}))}}if(this.hitCd=Math.max(0,(this.hitCd||0)-e),this.vx*=Math.max(0,1-e*(this.air?.4:7)),this.vz*=Math.max(0,1-e*(this.air?.4:7)),this.slowT>0){let e=this.slowMul==null?.6:this.slowMul;c*=e,l*=e}let u=this.type===`boar`?this.state===`charge`?24:9:this.type===`budgedragon`?8:this.type===`darksycledragon`?5:this.type===`wraith`?4:this.type===`orcscout`?11:this.type===`snowyeti`?7:Oe.has(this.type)?this.state===`dash`?30:8:D_(this.type)?D_(this.type).accelFn?D_(this.type).accelFn(this):D_(this.type).accel??10:30,d=1-Math.exp(-u*e);this.smx=(this.smx||0)+(c-(this.smx||0))*d,this.smz=(this.smz||0)+(l-(this.smz||0))*d;let f=this.smx+this.vx,p=this.smz+this.vz;this.moveSpd=Math.hypot(f,p),this.moveBy(f*e,p*e);let m=this.game.world.heightAt(this.x,this.z),h=Math.max(m,Va-.25);if(this.hover>0)this.y+=(h-this.y)*Math.min(1,e*8);else if(this.vy-=22*e,this.y+=this.vy*e,this.y<=h){if(this.air&&this.vy<-1){this.air=!1;let e=this.type===`slime`?10810767:this.type===`snowyeti`?13496063:13212415;t.fx.ring(this.x,this.y+.1,this.z,e,7,1.6,.08,.4),t.fx.dust(this.x,this.y,this.z,3,1.1,e),this.landT=.26,this.cd=Math.max(this.cd,.3)}this.y=h,this.vy=0}else this.y>h+.05&&(this.air=this.air||this.type===`slime`||this.type===`voidslime`);this.animate(e,a)}hopTo(e,t,n){this.pend={dx:e,dz:t,power:n},this.pendT=.17,this.yaw=Math.atan2(e,t)}launchHop(){let{dx:e,dz:t,power:n}=this.pend;this.pend=null;let r=Math.hypot(e,t)||1;this.vx=e/r*n*1.5,this.vz=t/r*n*1.5,this.vy=5.2,this.air=!0,this.yaw=Math.atan2(e,t),this.game.fx.dust(this.x,this.y,this.z,3,1,this.type===`slime`?10810767:13212415)}contact(e){this.hitCd=e.hurt(this.def.dmg,this.x,this.z,6)?.8:.4}animate(e,t){let n=this.obj,r=this.model,i=this.game,a=this.t+this.phase;if(e>1e-4){let t=Math.min(1,e*8);this.avx+=((this.x-this.px)/e-this.avx)*t,this.avz+=((this.z-this.pz)/e-this.avz)*t,this.yawRate+=(z(Gv(this.prevYaw,this.yaw)/e,-12,12)-this.yawRate)*t}this.px=this.x,this.pz=this.z,this.prevYaw=this.yaw;let o=Math.hypot(this.avx,this.avz),s=this.avx*Math.cos(this.yaw)-this.avz*Math.sin(this.yaw),c=qv(1-z(this.spawnT/.6,0,1)),l=this.hitT>0?this.hitT/.34:0,u=this.type===`snowyeti`,d=this.state===`windup`||u&&lf.has(this.state),f=Oe.has(this.type),p=T_.get(this.type),m=p&&p.holdsWarn(this)||f&&Vd(this.state)||d||this.type===`darksycledragon`&&this.state===`descend`||u&&(ff(this.state)||this.state===`rake3`);!m&&this.teleSlot?this.clearWarn():m&&this.placeWarn();let h=0;this.type===`wraith`?h=Math.sin(a*2.2)*.12+(d?.18*Math.min(1,this.t/.6):0):this.type===`darksycledragon`&&(h=this.state===`air`?Math.sin(a*5)*.16+Math.sin(a*11)*.05:Math.sin(a*2.4)*.08+Math.sin(a*(d?4:7.5)-.5)*.05),n.position.set(this.x,this.y+this.hover+h,this.z);let g=this.type===`darksycledragon`?-s*.05-this.yawRate*.012:this.type===`wraith`?-s*.07:-this.yawRate*.008;this.bank+=(z(g,-.32,.32)-(this.bank||0))*Math.min(1,e*7),Number.isNaN(this.bank)&&(this.bank=0),this.vyaw??(this.vyaw=this.yaw),this.vyaw+=Gv(this.vyaw,this.yaw)*(1-Math.exp(-(this.type===`boar`?13:this.type===`wraith`?8:10)*e));let _=this.avx*Math.sin(this.yaw)+this.avz*Math.cos(this.yaw);e>1e-4&&(this.accAlong=(this.accAlong||0)+((_-(this.prevAlong||0))/e-(this.accAlong||0))*Math.min(1,e*6)),this.prevAlong=_;let v=i.player.pos,y=this.dead?0:z(Gv(this.yaw,Math.atan2(v.x-this.x,v.z-this.z)),-.75,.75)*(t<15&&this.state!==`windup`&&this.state!==`charge`&&!(u&&uf.has(this.state))&&!(f&&Bd.has(this.state))&&!(p&&p.busy(this))?.7:0);this.lookSm=(this.lookSm||0)+(y-(this.lookSm||0))*Math.min(1,e*5),n.rotation.set(0,this.vyaw,this.type===`slime`||this.type===`voidslime`?0:this.bank);let b=this.type===`budgedragon`||this.type===`darksycledragon`||u||f||!!p?.FX[this.type].heavy,x=-l*(b?.1:.3)+(this.type===`slime`||this.type===`voidslime`?0:z(-(this.accAlong||0)*(b?.004:.007),-.12,.12)),S=Math.sin(this.t*70)*.05*l*(b?.5:1),C=0,w=1,T=1;if(this.type===`slime`||this.type===`voidslime`){let e=Math.sin(a*3.5)*.06,t,r;if(this.pend){let e=1-z(this.pendT/.17,0,1);r=1-.38*e,t=1+.26*e}else if(this.air){let e=z(this.vy/6,-1,1);r=1+e*.3,t=1-e*.17}else if(this.landT>0){let e=1-this.landT/.26,n=Math.exp(-e*3.2)*Math.cos(e*11);r=1-.34*n,t=1+.22*n}else r=1+e,t=1-e*.5;if(l>0){let e=l*Math.cos((1-l)*14);r*=1-.34*e,t*=1+.24*e}n.scale.set(t*this.baseScale*c,r*this.baseScale*c,t*this.baseScale*c)}else if(this.type===`boar`){let s=r.parts,l=this.state===`charge`,u=this.state===`recover`,f=l?1:u?0:Math.min(1,o/2.2);this.gaitC=(this.gaitC||0)+e*(l?17:4.5+o*2.4);let p=this.gaitC,m=Math.floor(p/Math.PI);m!==this.stepIdx&&(this.stepIdx=m,f>.7&&(i.fx.dust(this.x,this.y,this.z,l?2:1,l?1.3:.7),l&&t<9&&i.shake(.045)));let h=Math.min(1,e*22);s.legs.forEach((e,t)=>{let n=t===0||t===3?0:Math.PI;l&&(n=t<2?0:.9);let r=Math.sin(p+n)*(l?.95:.65)*f;d?r=t===0?-.45-Math.max(0,Math.sin(this.t*26))*.95:t===2||t===3?.12:-.05:u&&(r=Math.sin(a*3+t)*.04),e.rotation.x+=(r-e.rotation.x)*h}),d&&Math.sin(this.t*26)>.9&&Math.random()<e*40&&i.fx.dust(this.x+Math.sin(this.yaw)*.8-Math.cos(this.yaw)*.3,this.y,this.z+Math.cos(this.yaw)*.8+Math.sin(this.yaw)*.3,2,1.4);let g=Math.sin(a*2)*.03+(this.state===`wander`||this.state===`idle`?Math.max(0,Math.sin(a*5))*.05:0);d?g=.5+Math.min(.2,this.t*.4)+Math.sin(a*40)*.04:l?g=.42:u&&(g=.32+Math.sin(a*7)*.04),s.head.rotation.x+=(g-s.head.rotation.x)*Math.min(1,e*14),s.head.rotation.y=this.lookSm*.8,s.body.rotation.z=d?Math.sin(a*50)*.03:Math.sin(p)*.025*f,s.body.scale.y=1+Math.sin(a*(u?10:2.4))*(u?.035:.01),s.tail.rotation.z=Math.sin(a*(l?16:8))*.5,C=Math.abs(Math.sin(p))*.065*f*(l?1.4:1)-(d?.04:0),x+=(l?.1+Math.sin(p)*.04:d?.09:u?-.02:0)*1,w=1+.14*this.kick,T=1-.06*this.kick,n.scale.setScalar(c*this.baseScale),d&&this.model.mat.emissive.setRGB(.35+Math.sin(a*30)*.15,.03,0)}else if(p){let r=p.animate(this,e,{spd:o,t:a,hk:l,spawnS:c,dist:t,lookSm:this.lookSm,lat:s,bank:this.bank});C=r.rootY||0,x+=r.rootX||0,n.scale.setScalar(c*this.baseScale)}else if(f)C=af(this,e,{spd:o,t:a,hk:l,spawnS:c,dist:t,lookSm:this.lookSm}).rootY,n.scale.setScalar(c*this.baseScale);else if(u){let n=kf(this,e,{spd:o,t:a,hk:l,spawnS:c,dist:t,lookSm:this.lookSm});C=n.rootY,x+=n.rootX}else if(this.type===`orcscout`){let t=r.parts,i=Math.min(1,o/2.3);this.gaitC=(this.gaitC||0)+e*(3.2+o*2.1);let s=this.gaitC,l=Math.min(1,e*14),u=Math.sin(s)*.62*i,d=Math.sin(s+Math.PI)*.62*i;t.legL.rotation.x+=(u-t.legL.rotation.x)*l,t.legR.rotation.x+=(d-t.legR.rotation.x)*l,t.kneeL.rotation.x+=(Math.max(0,u)*1.25-t.kneeL.rotation.x)*l,t.kneeR.rotation.x+=(Math.max(0,d)*1.25-t.kneeR.rotation.x)*l,t.armL.rotation.x+=(.06-u*.5-t.armL.rotation.x)*l,t.armL.rotation.z+=(.1-t.armL.rotation.z)*l,t.elbowL.rotation.x+=(-.28-Math.max(0,-u)*.5-t.elbowL.rotation.x)*l;let f=-.25+Math.sin(s)*.08*i,p=-.38;if(this.state===`windup`){let e=Kv(Math.min(1,this.t/.42));f=-.25-e*2.25,p=-.38-e*.5}else if(this.state===`bite`){let e=Kv(z(this.t/.2,0,1));f=-2.5+e*2.25,p=-.88+e*.55}else this.state===`recover`&&(f=-.25,p=-.38);t.armR.rotation.x+=(f-t.armR.rotation.x)*Math.min(1,e*(this.state===`bite`?26:12)),t.armR.rotation.z+=(-.1-t.armR.rotation.z)*l,t.elbowR.rotation.x+=(p-t.elbowR.rotation.x)*Math.min(1,e*(this.state===`bite`?26:12));let m=(this.state===`windup`?.02:this.state===`bite`?.3:.12)+i*.05;t.body.rotation.x+=(m-t.body.rotation.x)*l,t.body.rotation.z=Math.sin(s)*.035*i,t.head.rotation.y+=(this.lookSm*.7-t.head.rotation.y)*Math.min(1,e*8),t.head.rotation.x+=((this.state===`chase`?.04:-.1)-t.head.rotation.x)*l,t.cloth.rotation.x=Math.sin(s*2)*.05*i+Math.sin(a*2)*.02,C=Math.abs(Math.sin(s))*.04*i,n.scale.setScalar(c*this.baseScale)}else if(this.type===`budgedragon`){let s=r.parts,l=this.puppet?.6:Math.min(1,o/2.4);this.gaitC=(this.gaitC||0)+e*(3+o*1.7);let u=this.gaitC,f=Math.floor(u/Math.PI);f!==this.stepIdx&&(this.stepIdx=f,l>.6&&(i.fx.dust(this.x,this.y,this.z,2,.9),t<8&&i.shake(.02)));let p=Math.min(1,e*20);s.legs.forEach((e,t)=>{let n=Math.sin(u+(t===0||t===3?0:Math.PI))*.7*l;e.rotation.x+=(n-e.rotation.x)*p});let m=d?Math.min(1,this.t/(this.atk===`spit`?.7:.3)):0;s.bodyG.position.y=.324+Math.abs(Math.sin(u))*.04*l+Math.sin(a*2.2)*.008-m*.045,s.bodyG.rotation.z=Math.sin(u)*.045*l+z(-this.yawRate*.012,-.12,.12),s.bodyG.scale.y=1+Math.sin(a*2.2)*.012+(d&&this.atk===`spit`?m*.05:0),s.tail.forEach((e,t)=>{let n=this.state===`chase`?5:2.4;e.rotation.y=Math.sin(a*n-t*.9)*(.32+t*.05)+z(this.yawRate*-.04,-.4,.4)*(t+1)*.35,e.rotation.x=t===0?-.12:.05});let h=this.state===`chase`||this.state===`bite`;s.wings.forEach((t,n)=>{let r=n===0?-1:1,i=d?r*(1.05+Math.sin(a*14)*.1*m):r*(h?.5+Math.sin(a*11)*.42:.7+Math.sin(a*2.5)*.06);t.rotation.z+=(i-t.rotation.z)*Math.min(1,e*18)});let g=Math.sin(a*1.7)*.04,_=.05+Math.max(0,Math.sin(a*.9+this.phase))*.06,v=0,y=Math.sin(a*.8)*.1*(this.state===`idle`);if(d)g=-.42*m,_=.2+.75*m,v=-.14*m,this.model.mat.emissive.setRGB(.28+Math.sin(a*34)*.12,.07,0),this.atk===`spit`&&i.vfx.glowNow(this.x+Math.sin(this.yaw)*1.4,this.y+1.05,this.z+Math.cos(this.yaw)*1.4,16747038,.6+m*1.6,.9),this.atk===`spit`&&Math.random()<e*36&&i.fx.emit(this.x+Math.sin(this.yaw)*1.4,this.y+1.05,this.z+Math.cos(this.yaw)*1.4,(Math.random()-.5)*.8,.8+Math.random(),(Math.random()-.5)*.8,[16751146,16769658][Math.random()<.5?0:1],.09,.35,-1);else if(this.state===`bite`){let e=Math.min(1,this.t/.1);g=.3*e,_=.8*(1-Math.min(1,this.t/.22))+.04,v=.14*e}else this.state===`chase`?(g=.1+Math.sin(u*.5)*.03+Math.sin(u)*.04*l,_=.12+Math.max(0,Math.sin(a*3))*.1):this.state===`recover`&&(g=.12,_=.04);g+=this.kick*.35,v+=this.kick*.2,s.head.rotation.x+=(g-s.head.rotation.x)*Math.min(1,e*16),s.head.rotation.y+=(y+this.lookSm-s.head.rotation.y)*Math.min(1,e*6),s.jaw.rotation.x+=(_-s.jaw.rotation.x)*Math.min(1,e*22),s.bodyG.rotation.x+=(v-s.bodyG.rotation.x)*Math.min(1,e*12),n.scale.setScalar(c*this.baseScale)}else if(this.type===`darksycledragon`||this.type===`volcanum`){let t=this.type===`volcanum`,l=r.parts,u=this.puppet?1:Math.min(1,o/2),f=this.state===`ascend`,p=this.state===`air`,m=this.state===`descend`,h=f||p||m,g=this.airCharge?z(this.airChargeT/.38,0,1):0,_=m?z(this.t/ey,0,1):0,v=f?8.5:p?6:m?3:this.state===`breath`?12:d?4:7.5+u*2.5,y=Math.min(1,e*10),b=4.2+Math.min(o,3.2)*2.1;this.gaitPhase=(this.gaitPhase||0)+e*b*(u>.04?1:.18);let x=this.gaitPhase,S=!1;l.legs.forEach((e,t)=>{let n=t<2,r=t%2==0?-1:1,i=x+(t===0||t===3?0:Math.PI),o=Math.sin(i),s=Math.max(0,Math.cos(i)),c=n?-.55:.45,d=n?.85:-.7;h&&!m?(c=n?-.95:.85,d=n?1.55:-1.45):m?(c=n?-1.15:-.35,d=n?-.1:-.5):u>.04?(c+=o*u*(n?.3:.38),d+=s*u*(n?.62:.78),s>.92&&u>.55&&(S=!0)):(c+=Math.sin(a*1.1+t*1.7)*.025,d+=Math.sin(a*1.4+t)*.035),e.rotation.x+=(c-e.rotation.x)*y,e.rotation.z+=(r*(n?-.045:.035)*(u>.04?1:.35)-e.rotation.z)*y,l.knees[t].rotation.x+=(d-l.knees[t].rotation.x)*y}),S&&u>.65&&!h&&(this.lastStepT||0)<=0&&(this.lastStepT=.34,i.fx.dust(this.x,this.y+.04,this.z,1.1,.55)),this.lastStepT=Math.max(0,(this.lastStepT||0)-e);let C=l.tail.length-1;l.tail.forEach((e,n)=>{let r=Math.sin(a*(d||g>0?6:2.6)-n*.8)*(.2+n*.06),i=0;d&&this.atk===`slash`&&(i=this.t/.38*2.2-1.1);let o=this.state===`recover`&&this.atk===`slash`?Math.max(0,1-this.t*3)*1.1:0;e.rotation.y=r+(n===0?(i+o)*.7:(i+o)*.45)+z(-s*.06,-.5,.5)*(n+1)*.3;let c=h?m?-.18:.1:0,l=t?n===0?-.32:n===C?.48:-.06+n*.05:n===0?-.1:n===C?-.05:.04;e.rotation.x=l+c}),l.wings.forEach((e,n)=>{let r=n===0?-1:1,i=this.state===`breath`?.35:d?.8:.3,o=this.state===`breath`?.22:d?.2:.55+u*.12,s=this.state===`breath`?.18:d?.25:.05,c=d||this.state===`breath`?0:.12;t&&!h&&!d&&this.state!==`breath`&&(i=1.05,o=.14,s=-.22,c=.04),f?(i=.12,o=.95,s=.05):p?(i=.2+g*.45,o=.72-g*.55,s=.05):m&&(i=.55+_*.7,o=.1,s=.3+_*.45,c=0),e.rotation.z=r*(i+Math.sin(a*v)*o),e.rotation.y=r*(s-Math.cos(a*v)*c);let y=l.wingsOuter[n],b=a*v-1.1;y.rotation.z=r*(Math.sin(b)*o*.8-(m?.5:.12)+Math.max(0,Math.cos(b))*.12),y.rotation.y=r*(-.08-Math.cos(b)*c*.8-(m?.3:0)),y.rotation.x=Math.sin(b)*(p?.08:.035)});let w=.08+Math.sin(a*1.6)*.04,T=t?.38:.05,E=Math.sin(a*.72)*.035,D=.06*u+Math.sin(a*v)*.025+z(o*.01,0,.06);if(f){let e=z(this.t/Qv,0,1);w=-.25*e,T=.2+.35*e,D=-.34*Math.sin(e*Math.PI*.8)-.04}else if(p)w=.12-.5*g,T=.12+.6*g,D=-.1-.12*g+Math.sin(a*v)*.04;else if(m)w=.35+.2*_,T=.7,D=.25+.55*_;else if(this.state===`breath`)w=.28+Math.sin(a*34)*.06,T=1.05,D=.24+Math.sin(a*16)*.035;else if(d){let e={slash:.38,tail:.5,sickle:.65,gloom:.95,breath:.85}[this.atk]||.6,t=Math.min(1,this.t/e);w=this.atk===`slash`||this.atk===`tail`?.12:this.atk===`breath`?-.15+.35*t:-.4*t,T=this.atk===`breath`?.2+.85*t:.1+.55*t,D=this.atk===`breath`?.08*t:-.24*t}else this.state===`recover`&&(w=.2,T=.3*Math.max(0,1-this.t*3));let ee=this.state===`breath`?1:d&&this.atk!==`slash`&&this.atk!==`tail`?Math.min(1,this.t/({sickle:.65,gloom:.95,breath:.85}[this.atk]||.6)):g;if(ee>0){let n=.18+ee*.25+Math.sin(a*30)*.06;this.model.mat.emissive.setRGB(t?n*1.1:n*.6,t?n*.35:n*.2,t?n*.05:n);let r=t?2.4*this.baseScale*.55:2.2,o=this.x+Math.sin(this.yaw)*r,s=this.z+Math.cos(this.yaw)*r,c=this.y+this.hover+(t?2.3:1.6);if(i.vfx.glowNow(o,c,s,t?16738834:5941503,.6+ee*(t?2.8:2.2),.9),Math.random()<e*40*ee){let e=Math.random()*Wv,n=t?[16734738,16769162]:[5941503,13035263];i.fx.emit(o+Math.cos(e)*.7,c+Math.sin(e)*.7,s,(t?Math.sin(this.yaw)*3:0)-Math.cos(e)*1.8,-Math.sin(e)*1.8,t?Math.cos(this.yaw)*3:0,n[Math.random()<.5?0:1],.08,.38,t?2:0)}}if(p&&Math.random()<e*16&&i.fx.emit(this.x+(Math.random()-.5)*2.2,this.y+this.hover+.8,this.z+(Math.random()-.5)*2.2,0,-1.2,0,[5019624,9591012][Math.random()<.5?0:1],.08,.5,0),w+=this.kick*.3,D+=this.kick*.2,f?E=-.16:m?E=.22+_*.12:this.state===`breath`?E=.12+Math.sin(a*16)*.025:d&&(E=this.atk===`breath`?-.08:-.18),l.neck){l.neck.rotation.x+=(E-l.neck.rotation.x)*Math.min(1,e*7),l.neck.rotation.y+=(this.lookSm*.62-l.neck.rotation.y)*Math.min(1,e*4.5);let t=-this.yawRate*.004+this.bank*.16;l.neck.rotation.z+=(t-l.neck.rotation.z)*Math.min(1,e*5)}l.head.rotation.x+=(w-l.head.rotation.x)*Math.min(1,e*14);let O=this.lookSm*.38+Math.sin(a*.9)*(u<.1?.045:.012);l.head.rotation.y+=(O-l.head.rotation.y)*Math.min(1,e*8),l.head.rotation.z+=(-this.yawRate*.012-l.head.rotation.z)*Math.min(1,e*5),l.jaw.rotation.x+=(T-l.jaw.rotation.x)*Math.min(1,e*18),l.bodyG.rotation.x+=(D-l.bodyG.rotation.x)*Math.min(1,e*(m?14:8));let k=1+Math.sin(a*1.75)*(u<.08?.012:.006);l.body.scale.y+=(k-l.body.scale.y)*Math.min(1,e*3.5),l.bodyG.rotation.z=Math.sin(a*1.3)*.04+this.bank*.12,n.scale.setScalar(c*this.baseScale)}else if(this.type===`chicken`){let t=r.body,i=this.state===`flee`,s=o>.2&&!i,l=this.state===`peck`?Math.sin(a*16)*.4+.12:i?-.22:0,u=i?Math.sin(a*22)*.12:s?Math.sin(a*10)*.06:0;t&&(t.rotation.x+=(l-t.rotation.x)*Math.min(1,e*10),t.rotation.z=u),n.scale.setScalar(c*this.baseScale)}else if(this.type===`wraith`){let t=r.body,s=z(o*.07,0,.22),l=d?Math.min(1,this.t/.7):0;if(t.rotation.z=Math.sin(a*1.7)*.06+this.bank*.5,t.rotation.x+=((d?-.3*l:s+.05*Math.sin(a*2))-t.rotation.x)*Math.min(1,e*9)+this.kick*.02,t.scale.set(1-l*.08+this.kick*.12,1+l*.12-this.kick*.1,1-l*.08+this.kick*.12),n.scale.setScalar(c*this.baseScale),d&&(this.model.mat.emissive.setRGB(.25+Math.sin(a*36)*.15,0,.35),i.vfx.glowNow(this.x+Math.sin(this.yaw)*.6,this.y+this.hover+1.5,this.z+Math.cos(this.yaw)*.6,12745727,.5+l*1.5,.9),Math.random()<e*30*l)){let e=Math.random()*Wv;i.fx.emit(this.x+Math.sin(this.yaw)*.6+Math.cos(e)*.6,this.y+this.hover+1.5+Math.sin(e)*.6,this.z+Math.cos(this.yaw)*.6,-Math.cos(e)*1.6,-Math.sin(e)*1.6,0,12745727,.08,.35,0)}}if(r.root.rotation.x=x,r.root.rotation.z=S,r.root.position.y=C,r.root.scale.set(T,T,w),this.flash>0?this.model.mat.emissive.setRGB(.38,.32,.22):this.type!==`slime`&&this.type!==`voidslime`&&this.state===`windup`||this.type===`scorpion`&&this.state===`stingwind`||this.type===`darksycledragon`&&this.airCharge||this.type===`volcanum`&&(this.state===`breath`||this.state===`air`||this.state===`ascend`)||u&&(this.state===`hurlwind`||this.state===`breathwind`)||this.model.mat.emissive.setRGB(0,0,0),this.debugTank&&!this.dead||t<14&&this.hp<this.maxHp){let[e,n,r]=i.screenOf(this.x,this.y+this.hover+(this.type===`chicken`?.9:this.type===`boar`?1.5:this.type===`wraith`?2.5:this.type===`budgedragon`?2.1:this.type===`darksycledragon`||this.type===`volcanum`?7.2:this.type===`orcscout`?2.55:p?p.FX[this.type].plateY:u?4.4:f?3.9:1.25),this.z,!0),a=this.debugTank?`<small>${Mv(this)}</small>`:``;i.hud.plate(this.id,`${this.name}${a}<span class="hpbar"><i style="width:${this.hp/this.maxHp*100}%"></i></span>`,`mon`),i.hud.placePlate(this.id,e,n,r,{dist:t})}else i.hud.removePlate(this.id)}deadAnim(e){let t=this.game,n=this.obj,r=this.model,i=t.fx;this.deadT+=e;let a=this.deadT,o=Jv[this.type]||.6,s=this.baseScale,c=t.world,l=Math.max(c.heightAt(this.x,this.z),Va-.25),u=this.deadFlags,d=this.deadSide,f=z(a/.1,0,1);this.vx*=Math.max(0,1-e*5),this.vz*=Math.max(0,1-e*5),this.moveBy(this.vx*e,this.vz*e),this.vy-=22*e,this.y+=this.vy*e,this.y<l&&(this.y=l,this.vy=0);let p=a<.1?.8*(1-f)+.2:0;r.mat.emissive.setRGB(p,p,p);let m=(t,n,r,o=2)=>{let c=z((a-t)/n,0,1);if(c>0&&c<1&&Math.random()<e*70)for(let e=0;e<o;e++){let e=Math.random()*Wv,t=Math.random()*.9*s;i.emit(this.x+Math.cos(e)*t,this.y+this.hover+.2+Math.random()*1,this.z+Math.sin(e)*t,(Math.random()-.5)*.6,1.2+Math.random()*1.6,(Math.random()-.5)*.6,r[Math.floor(Math.random()*r.length)],.1+Math.random()*.08,.7,-.4)}return c};if(this.type===`slime`||this.type===`voidslime`){let e,t;if(a<.12){let n=a/.12;t=1+.4*n,e=1-.2*n}else{let n=z((a-.12)/.3,0,1);t=1.4*(1-n)+.1*n,e=.8+.9*n;let r=z((a-.38)/.22,0,1);t*=1-r,e*=1-r*.7}if(!u.pop&&a>.36){u.pop=!0;let e=this.type===`slime`?[5756012,10810767,16777215]:[12745727,9196250,16777215];i.ring(this.x,this.y+.15,this.z,e[1],14,3.2,.1,.45),i.burst(this.x,this.y+.3,this.z,e,16,4.2,.12,.7,10,2)}n.scale.set(e*s,Math.max(.001,t)*s,e*s),n.position.set(this.x,this.y,this.z),n.rotation.set(0,this.yaw,0)}else if(this.type===`boar`){let e=r.parts,o=Kv(z(a/.3,0,1)),c=a>.3?Math.exp(-(a-.3)*8)*Math.sin((a-.3)*28)*.08:0;n.position.set(this.x,this.y,this.z),n.rotation.set(0,this.yaw,d*(o*1.5+c)),r.root.position.y=.34*o,r.root.rotation.x=0,e.legs.forEach((e,t)=>e.rotation.x=Math.sin(a*30+t*1.7)*.8*Math.max(0,1-a/.75)),e.head.rotation.x=.3*o,!u.land&&a>.28&&(u.land=!0,i.shockwave(this.x,this.y,this.z,14272928,1.2),t.shake(.14));let l=m(.85,.45,[13211258,16777215,10211434]);n.scale.setScalar(s*(1-l*l))}else if(this.type===`snowyeti`){let o=r.parts,c=Kv(z(a/.75,0,1)),l=a>.75?Math.exp(-(a-.75)*7)*Math.sin((a-.75)*24)*.05:0;if(n.position.set(this.x,this.y,this.z),n.rotation.set(0,this.yaw,0),r.root.rotation.x=-1.5*c+l,r.root.position.y=.25*c,o.armL.rotation.x=-2.4*(1-c)-.4*c,o.armR.rotation.x=-2*(1-c)-.6*c,o.armL.rotation.z=-.5-c*.6,o.armR.rotation.z=.5+c*.6,o.elbowL.rotation.x=-.4,o.elbowR.rotation.x=-.4,o.legL.rotation.x=-.4*c,o.legR.rotation.x=.2*c,o.kneeL.rotation.x=.5*c,o.head.rotation.x=-.6*(1-c)+.2*c,o.jaw.rotation.x=1*(1-c)+.3*c,!u.land&&a>.72&&(u.land=!0,i.shockwave(this.x,this.y,this.z,13496063,3.4),i.ring(this.x,this.y+.3,this.z,8376575,22,6,.12,.55),i.burst(this.x,this.y+.8,this.z,[11849958,15137279,8376575,16777215],22,5,.14,.9,8,3),t.shake(.5),t.punch(.35)),a>.2&&a<1.3&&Math.random()<e*30){let e=Math.random()*Wv;i.emit(this.x+Math.cos(e)*1.4,this.y+.4+Math.random()*1.6,this.z+Math.sin(e)*1.4,0,1.2,0,[12577535,16777215,8376575][Math.floor(Math.random()*3)],.12,.7,-.5)}let d=m(1.25,.85,[11849958,15137279,8376575,16777215],5);d>=1&&!u.shatter&&(u.shatter=!0,i.burst(this.x,this.y+.8,this.z,[15137279,8376575,16777215],26,4.5,.14,.9,6,3)),n.scale.setScalar(s*(1-d*d))}else if(T_.has(this.type))T_.get(this.type).dead(this,e,{u:a,dissolve:m,ease:Kv,side:d,bs:s,fl:u,floor:l});else if(Oe.has(this.type)){let e=r.parts,o=this.type===`demonknight`,c=Kv(z(a/.6,0,1)),l=a>.6?Math.exp(-(a-.6)*7)*Math.sin((a-.6)*24)*.04:0;n.position.set(this.x,this.y,this.z),n.rotation.set(0,this.yaw,0),r.root.rotation.x=-1.35*c+l,r.root.position.y=.22*c,e.legL.rotation.x=-.5*c,e.legR.rotation.x=.3*c,e.kneeL.rotation.x=.7*c,e.kneeR.rotation.x=.2*c,e.armL.rotation.x=-.3*(1-c)-.2*c,e.armR.rotation.x=-.3*(1-c)-.2*c,e.head.rotation.x=.5*c,!u.land&&a>.58&&(u.land=!0,i.shockwave(this.x,this.y,this.z,o?6969944:16773328,3),i.ring(this.x,this.y+.3,this.z,o?16726554:7321855,20,5,.12,.5),t.shake(.4),t.punch(.3));let d=m(1.2,.9,o?[3816002,16726554,16747050,16777215]:[14672358,16765562,7321855,16777215],5);n.scale.setScalar(s*(1-d*d))}else if(this.type===`orcscout`){let e=r.parts,t=Kv(z(a/.28,0,1));n.position.set(this.x,this.y,this.z),n.rotation.set(0,this.yaw,t*1.45*d),r.root.position.y=.15*t,e.legL.rotation.x=.4*t,e.legR.rotation.x=-.2*t,e.armR.rotation.x=-.4+t*.6,e.armL.rotation.z=.9*t,e.kneeL.rotation.x=.5*t,e.head.rotation.x=.4*t;let i=m(.7,.5,[6986312,5914672,15129796]);n.scale.setScalar(s*(1-i*i))}else if(this.type===`budgedragon`){let e=r.parts,o=Kv(z(a/.3,0,1)),c=Kv(z((a-.3)/.45,0,1)),l=a>.75?Math.exp(-(a-.75)*6)*Math.sin((a-.75)*22)*.07:0;n.position.set(this.x,this.y,this.z),n.rotation.set(0,this.yaw,d*(c*1.52+l)),r.root.rotation.x=-.4*o*(1-c),r.root.position.y=.62*c,e.head.rotation.x=-.65*o*(1-c)+.25*c,e.jaw.rotation.x=.9*(1-c)+.25*c,e.wings.forEach((e,t)=>e.rotation.z=(t===0?-1:1)*(1.15*(1-c)+1.5*c+Math.sin(a*14)*.08*(1-c))),e.legs.forEach((e,t)=>e.rotation.x=Math.sin(a*22+t)*.6*Math.max(0,1-a/.9)),e.tail.forEach((e,t)=>e.rotation.y=Math.sin(a*5-t*.9)*.4*Math.max(.15,1-a/1.3)),!u.land&&a>.74&&(u.land=!0,i.shockwave(this.x,this.y,this.z,13162656,2),t.shake(.4),t.punch(.3));let f=m(1.15,.6,[7328858,15853254,16777215],3);n.scale.setScalar(s*(1-f*f))}else if(this.type===`darksycledragon`||this.type===`volcanum`){let o=this.type===`volcanum`,c=r.parts;this.hover>0&&(this.hvy-=24*e,this.hover=Math.max(0,this.hover+this.hvy*e));let l=this.hover>0;!l&&!u.land&&(u.land=!0,u.landT=a,i.shockwave(this.x,this.y,this.z,o?16747044:12166880,2.4),i.ring(this.x,this.y+.3,this.z,o?16734738:11689215,16,5,.12,.5),t.shake(.5),t.punch(.4));let f=u.land?Kv(z((a-u.landT)/.5,0,1)):0,p=l?Math.min(.6,a*1.6):.6*(1-f);n.position.set(this.x,this.y+this.hover,this.z),n.rotation.set(0,this.yaw,d*f*1.5),r.root.rotation.x=p,r.root.position.y=.6*f,c.head.rotation.x=-.4*(1-f)+.2*f,c.jaw.rotation.x=.7*(1-f)+.2*f,c.wings.forEach((e,t)=>{let n=t===0?-1:1;e.rotation.z=n*(.9+Math.sin(a*22)*.6*!!l+f*.7)}),c.tail.forEach((e,t)=>e.rotation.y=Math.sin(a*9-t)*.5*Math.max(.1,1-a/1.4));let h=Math.max(0,1-a/1.2)*(.5+.5*Math.sin(a*40));a>.1&&r.mat.emissive.setRGB(o?h:h*.5,o?h*.35:.02,o?h*.05:h*.8);let g=m(1.3,.75,o?[16734738,16769162,1708560]:[11689215,14210030,2827344],3);n.scale.setScalar(s*(1-g*g))}else if(this.type===`chicken`){let e=Kv(z(a/.22,0,1));n.position.set(this.x,this.y,this.z),n.rotation.set(0,this.yaw,d*e*1.45),r.root.position.y=.1*e,r.body&&(r.body.rotation.x=.35*e);let t=m(.22,.4,[16775920,16095786,14694970,16777215]);n.scale.setScalar(s*(1-t*t))}else{let t=z(a/o,0,1);this.yaw+=e*(10+22*t),this.hover+=e*(1.2+2*t);let c=1-t*t*.95;n.position.set(this.x,this.y+this.hover,this.z),n.rotation.set(0,this.yaw,0),n.scale.set(s*c,s*(1+.8*t)*(1-t*t*.9),s*c);let l=.4+.4*Math.sin(a*50);if(r.mat.emissive.setRGB(l*.5,0,l),Math.random()<e*80){let e=a*18+Math.random();i.emit(this.x+Math.cos(e)*.5*(1-t),this.y+this.hover+.2+t*1.5,this.z+Math.sin(e)*.5*(1-t),Math.cos(e)*.8,1.4,Math.sin(e)*.8,[12745727,16777215,9196250][Math.floor(Math.random()*3)],.1,.5,-.5)}}a>=o&&(this.remove=!0)}dispose(){this.game.scene.remove(this.obj),this.game.hud.removePlate(this.id),this.obj.traverse(e=>{e.isMesh&&e.geometry&&!e.userData.sharedGeo&&e.geometry.dispose()})}},ly={tiger:5,raptor:7,cursedpirate:6,pirate:7},uy={sandworm:4,scorpion:6},dy=class{constructor(e){this.game=e,this.timer=1,this.rng=new Kt(4242),this.max=9;let t=(e.world?.chickenNests||[]).map(e=>({x:e.x,z:e.z,t:0,pen:e.pen}));this.nests=ry.map(([e,t])=>({x:e,z:t,t:0})).concat(t)}populate(e=!1){let t=this.game.world;for(let[e,t,n]of[[`slime`,60,40],[`slime`,84,44],[`voidslime`,68,28],[`wraith`,78,29],[`boar`,52,44],[`boar`,94,48],[`slime`,118,60],[`slime`,44,70],[`slime`,76,102],[`budgedragon`,120,74]])this.spawn(e,t,n,!1);if(this.fillChickens(99),e){this.volcanumT=0;return}let n=t.orcCamp;if(n)for(let[e,t]of[[-2.2,.6],[1.8,-1.1],[.3,2.5],[8.2,4.8],[-6.4,6.6],[2.4,-9.2]])this.spawn(`orcscout`,n.x+e,n.z+t,!1);if(t.yetiPeak)for(let[e,n]of[[0,0],[-7.5,5.5],[8,-4.5],[-3,-9.5]])this.spawn(`snowyeti`,t.yetiPeak.x+e,t.yetiPeak.z+n,!1);for(let[e,n]of[[`demonKeep`,`demonknight`],[`holyKeep`,`holyknight`]]){let r=t[e];if(r)for(let[e,t]of r.posts)this.spawn(n,r.x+e,r.z+t,!1)}if(t.warfield&&this.spawn(`keepwarden`,t.warfield.x,t.warfield.z,!1),t.jungle)for(let[e,t]of Object.entries(ly))for(let n=0;n<Math.ceil(t*.7);n++){let t=this.jungleSpot(e,0);t&&this.spawn(e,t.x,t.z,!1)}if(t.desert)for(let[e,t]of Object.entries(uy))for(let n=0;n<t;n++){let t=this.desertSpot(e,0);t&&this.spawn(e,t.x,t.z,!1)}if(t.cave){let e=this.spawn(`darksycledragon`,t.cave.nest.x,t.cave.nest.z,!1);e.realm=`cave`}if(t.volcanumLair){let e=this.spawn(`volcanum`,t.volcanumLair.x,t.volcanumLair.z,!1);e.home={x:t.volcanumLair.x,z:t.volcanumLair.z},this.volcanumSpawned=!0,this.volcanumT=0}}spawn(e,t,n,r=!0){let i=this.game,a=new cy(i,e,t,n);return i.monsters.push(a),r&&(i.fx.burst(t,a.y+.5,n,[12745727,7009535,16777215],14,3,.1,.6),i.fx.ring(t,a.y+.1,n,12745727,16,4,.1,.5)),a}pickSpot(){let e=this.game,t=e.world,n=e.player.pos;for(let e=0;e<24;e++){let e=this.rng,r=e.next(),i,a;if(r<.45){let t=e.range(0,Wv),n=e.range(2.5,8);i=Ba.x+Math.cos(t)*n,a=Ba.z+Math.sin(t)*n+3}else{let t=e.range(0,Wv),n=e.range(15,38);i=La.x+Math.cos(t)*n,a=La.z+Math.sin(t)*n}if(!t.playable(i,a))continue;let o=t.zoneAt(i,a);if(o!==Xa.TOWN&&o!==Xa.WATER&&o!==Xa.LAKE&&o!==Xa.MINE&&!(Math.hypot(i-Wa.x,a-Wa.z)<17||Math.hypot(i-Ga.x,a-Ga.z)<16)&&!(t.heightAt(i,a)<.9||t.heightAt(i,a)>7)&&!(Math.hypot(i-n.x,a-n.z)<14))return{x:i,z:a,nearGate:r<.45}}return null}update(e){if(this.game.net?.role===`guest`||(this.fillChickens(e),this.game.world?.realm===`cave`||this.game.world?.realm===`rift`))return;let t=this.game;if(this.timer-=e,this.timer>0||(this.timer=3.5,this.fillOrcs(),this.fillYetis(),this.fillKnights(),this.fillWarden(),this.fillVolcanum(),this.fillJungle(),this.fillDesert(),t.monsters.filter(e=>!e.dead&&e.type!==`chicken`&&e.type!==`orcscout`&&e.type!==`snowyeti`&&e.type!==`volcanum`&&!Oe.has(e.type)&&!T_.has(e.type)).length>=this.max))return;let n=this.pickSpot();if(!n)return;let r=this.rng.next(),i;i=n.nearGate?r<.35?`voidslime`:r<.7?`wraith`:`slime`:r<.45?`slime`:r<.85?`boar`:`voidslime`,t.sky.night>.6&&r>.6&&(i=`wraith`);let a=t.monsters.filter(e=>!e.dead&&e.type===`budgedragon`).length;!n.nearGate&&a<2&&this.rng.next()<.3&&(i=`budgedragon`),this.spawn(i,n.x,n.z),n.nearGate&&t.audio.portal()}fillChickens(e){let t=this.game,n=t.player?.pos,r=t.world;if(n&&r&&this.nests)for(let i of this.nests){if(t.monsters.some(e=>e.nest===i&&!e.dead)){i.t=0;continue}if(i.t+=e,i.t<iy)continue;let a=i.x,o=i.z;if(Math.hypot(n.x-a,n.z-o)<1.5){let e=Math.atan2(o-n.z,a-n.x);a+=Math.cos(e)*1.4,o+=Math.sin(e)*1.4}if((!r.playable(a,o)||r.heightAt(a,o)<.6)&&(a=i.x,o=i.z),!r.playable(a,o))continue;i.t=0;let s=this.spawn(`chicken`,a,o,!1);s.nest=i,s.pen=i.pen||null,s.home.x=i.x,s.home.z=i.z}}fillYetis(){let e=this.game.world.yetiPeak;if(!e)return;let t=this.game;if(t.monsters.filter(e=>!e.dead&&e.type===`snowyeti`).length>=4||(this.yetiT=(this.yetiT||0)+1,this.yetiT<14))return;let n=t.world,r=t.player.pos,i=this.rng.range(0,Wv),a=this.rng.range(3,14),o=e.x+Math.cos(i)*a,s=e.z+Math.sin(i)*a;!n.playable(o,s)||Math.hypot(o-r.x,s-r.z)<18||(this.yetiT=0,this.spawn(`snowyeti`,o,s))}fillKnights(){let e=this.game,t=e.world;if(this.knightT=(this.knightT||0)+1,!(this.knightT<40))for(let[n,r]of[[`demonKeep`,`demonknight`],[`holyKeep`,`holyknight`]]){let i=t[n];if(!i||e.monsters.filter(e=>!e.dead&&e.type===r).length>=i.posts.length)continue;let[a,o]=i.posts[this.rng.int(0,i.posts.length-1)],s=i.x+a,c=i.z+o;!t.playable(s,c)||Math.hypot(s-e.player.pos.x,c-e.player.pos.z)<22||(this.knightT=0,this.spawn(r,s,c))}}fillVolcanum(){let e=this.game,t=e.world?.volcanumLair;if(!t||e.world?.realm!==`over`)return;if(e.monsters.some(e=>!e.dead&&e.type===`volcanum`)){this.volcanumSpawned=!0,this.volcanumT=0;return}let n=!this.volcanumSpawned;if(this.volcanumT=(this.volcanumT||0)+1,this.volcanumT<(n?1:90)||!n&&Math.hypot(t.x-e.player.pos.x,t.z-e.player.pos.z)<28)return;this.volcanumT=0,this.volcanumSpawned=!0;let r=this.spawn(`volcanum`,t.x,t.z);r.home={x:t.x,z:t.z}}fillWarden(){let e=this.game,t=e.world?.warfield;t&&e.world?.realm===`over`&&(this.wardenT=(this.wardenT||0)+1,this.wardenT<80||e.monsters.some(e=>!e.dead&&e.type===`keepwarden`)||Math.hypot(t.x-e.player.pos.x,t.z-e.player.pos.z)<22||(this.wardenT=0,this.spawn(`keepwarden`,t.x,t.z)))}jungleSpot(e,t=22){let n=this.game,r=n.world,i=r.jungle;if(!i)return null;let a=n.player.pos,o=this.rng;for(let n=0;n<30;n++){let n,s;if(e===`pirate`){let e=i.yards[o.int(0,i.yards.length-1)],t=o.range(0,Wv),r=o.range(2,e.r);n=e.x+Math.cos(t)*r,s=e.z+Math.sin(t)*r}else{let e=i.lands[o.int(0,i.lands.length-1)];if(n=e.x0+o.range(14,130),s=e.z0+o.range(14,130),i.yards.some(e=>Math.hypot(n-e.x,s-e.z)<e.r+10))continue}if(!r.playable(n,s)||r.isWater(n,s))continue;let c=r.heightAt(n,s);if(!(c<.9||c>6.5||!r.free(n,s,1.1))&&!(e!==`pirate`&&(c<1.8||r.zoneAt(n,s)!==Xa.FOREST))&&!(t&&Math.hypot(n-a.x,s-a.z)<t))return{x:n,z:s}}return null}fillJungle(){let e=this.game;if(!e.world.jungle)return;let t=e.player.pos;if(e.world.jungle.lands.some(e=>t.x>=e.x0-40&&t.x<e.x0+184&&t.z>=e.z0-40&&t.z<e.z0+184)&&(this.jungleT=(this.jungleT||0)+1,!(this.jungleT<4)))for(let[t,n]of Object.entries(ly)){if(e.monsters.filter(e=>!e.dead&&e.type===t).length>=n)continue;let r=this.jungleSpot(t);if(r){this.jungleT=0,this.spawn(t,r.x,r.z);return}}}desertSpot(e,t=16){let n=this.game,r=n.world,i=r.desert;if(!i)return null;let a=n.player.pos,o=i.mine,s=i.oasis;for(let n=0;n<24;n++){let c=i.lands[(n+(e===`sandworm`?0:1))%i.lands.length],l=c.x0+12+this.rng.range(0,120),u=c.z0+12+this.rng.range(0,100);if(!r.playable(l,u))continue;let d=r.zoneAt(l,u);if(d===Xa.WATER||d===Xa.MINE)continue;let f=r.heightAt(l,u);if(!(f<.9||f>6.5)&&!(Math.hypot(l-o.x,u-o.z)<o.rimR+2)&&!(Math.hypot(l-s.x,u-s.z)<s.r+6)&&!(t&&Math.hypot(l-a.x,u-a.z)<t))return{x:l,z:u}}return null}fillDesert(){let e=this.game,t=e.world.desert;if(!t)return;let n=e.player.pos;if(t.lands.some(e=>n.x>=e.x0-30&&n.x<e.x0+174&&n.z>=e.z0-30&&n.z<e.z0+174)&&(this.desertT=(this.desertT||0)+1,!(this.desertT<4)))for(let[t,n]of Object.entries(uy)){if(e.monsters.filter(e=>!e.dead&&e.type===t).length>=n)continue;let r=this.desertSpot(t);if(r){this.desertT=0,this.spawn(t,r.x,r.z);return}}}fillOrcs(){let e=this.game.world.orcCamp;if(!e)return;let t=this.game;if(t.monsters.filter(e=>!e.dead&&e.type===`orcscout`).length>=6)return;let n=t.world,r=t.player.pos,i=this.rng.range(0,Wv),a=this.rng.range(2,12),o=e.x+Math.cos(i)*a,s=e.z+Math.sin(i)*a;!n.playable(o,s)||n.heightAt(o,s)>6||Math.hypot(o-r.x,s-r.z)<12||this.spawn(`orcscout`,o,s)}},fy=(e,t,n,r,i=0,a=.05)=>U(e,a,l(t,n,r,i)),py=.06,my={org:14711324,orgHi:16095808,orgLo:12081682,blk:1709072,wht:15920868,whtLo:14012352,claw:15985362,clawLo:13221274,clawTip:16776170},hy={olv:8225848,olvLo:5594150,tan:12298090,tanLo:10259026,grey:9080468,greyHi:12370118,claw:15327164,clawLo:12101752,tip:16774864},gy={gold:13804076,goldHi:16767322,goldLo:10122520},_y={bone:15261896,boneLo:12563606,boneDark:9076840};function vy(e,t){let n=new W(24,22,6);for(let e=0;e<18;e++)for(let r=0;r<22;r++){let i=Math.sin(r*.6)*1.1+Math.cos(e*.5)*.8,a=Math.abs(r+.5-11)/10,o=Math.abs(e+.5-9)/8;if(a**3+o**3>1+i*.06)continue;let s=(a>.82||o>.8)&&(r+e)%2==0,c=t(r,e,0);n.set(r,e+1,0,fy(s?3809812:c.lo,r,e,0,21,.05)),n.set(r,e+1,1,fy(s?2364424:c.lo,r,e,1,22,.05)),!s&&a<.86&&o<.84&&n.set(r,e+1,2,fy(c.hi,r,e,2,23,.04))}return R(n,11,10,2,e,py)}function yy(e){return vy(e,(e,t)=>{let n=((e+Math.round(Math.sin(t*.5)*1.5))%6+6)%6,r=n<2&&l(e>>1,t>>2,0,24)<.9;return t>14||e<3&&t>4?{hi:my.wht,lo:my.whtLo}:r?{hi:my.blk,lo:920072}:{hi:n===5?my.orgLo:my.org,lo:my.orgLo}})}function by(e){return vy(e,(e,t)=>{let n=t>>1,r=l(e+(n&1)>>1,n,0,25),i=r<.4?hy.olv:r<.62?hy.olvLo:r<.9?hy.tan:hy.tanLo;return{hi:!(e+(n&1)&1)&&!(t&1)?hy.olvLo:i,lo:hy.olvLo}})}function xy(e,t,n,r,i){let a=new W(28,26,8),o=Math.round(26*n);for(let e=0;e<o;e++){let s=e/(o-1),c=s*r,l=Math.round(5+Math.sin(c)*15*n),u=Math.round(2+(1-Math.cos(c))*15*n),d=Math.max(.6,3.6*n*(1-s)+.5);for(let e=-3;e<=3;e++)for(let n=-3;n<=3;n++)for(let r=0;r<6;r++){if(Math.hypot(e,n,(r-2.5)*1.1)>d*.9)continue;let o=s<.14?t.base:s>.78?t.tip:r<2?t.clawLo:t.claw;a.set(l+e,u+n,r+1,fy(o,l+e,u+n,r,i,.03))}}return R(a,13,11,4,e,py)}var Sy=e=>xy(e,{base:my.orgLo,tip:my.clawTip,claw:my.claw,clawLo:my.clawLo},1,1.5,26),Cy=e=>xy(e,{base:hy.greyHi,tip:hy.tip,claw:hy.claw,clawLo:hy.clawLo},1.15,2.1,27);function wy(e){let t=new W(30,30,5);for(let e=0;e<40;e++){let n=e/39,r=Math.round(6+n*15+Math.sin(n*2.6)*3),i=Math.round(6+n*20),a=n<.75?3:Math.max(1,3-(n-.75)*10);for(let e=0;e<a;e++){let n=e===0,o=e===a-1&&a>2;t.set(r+e,i,2,fy(n?15922940:o?9082022:13095134,r+e,i,2,28,.03)),!n&&!o&&t.set(r+e,i,1,fy(10134710,r+e,i,1,29,.03))}}for(let e=-3;e<=3;e++)for(let n=0;n<5;n++)t.set(6+e,6,n,fy(Math.abs(e)===3?gy.goldHi:gy.gold,e,6,n,30,.03));for(let e=2;e<6;e++)for(let n=1;n<4;n++)t.set(6,e,n,fy(e%2?5913118:3810322,6,e,n,31,.04));for(let e=1;e<4;e++)t.set(6,1,e,fy(gy.goldHi,6,1,e,32,.03));return R(t,12,14,2,e,py)}function Ty(e){let t=new W(22,14,22),n=(e,n,r,i)=>{for(let a=-i;a<=i;a++)for(let o=-i;o<=i;o++){let s=Math.hypot(a,o);if(s>i+.2)continue;let c=s>i-.9;t.set(e+a,r,n+o,fy(c?gy.goldLo:a+o&1?gy.goldHi:gy.gold,e+a,r,n+o,33,.03))}},r=[[10,10,5,5],[9,11,4,5],[11,9,3,5],[10,10,2,5],[10,10,1,5],[5,6,3,3],[5,6,2,3],[5,6,1,3],[16,7,2,3],[16,7,1,3],[15,16,2,3],[15,16,1,3],[7,16,1,3]];for(let e=0;e<r.length;e++){let[t,i,a,o]=r[e];n(t,i,a,o)}for(let e=9;e<12;e++)for(let n=9;n<12;n++)t.set(e,6,n,fy(gy.goldHi,e,6,n,34,.02));return R(t,11,1,11,e,py)}function Ey(e){let t=new W(32,12,32),n=(e,n,r,i,a)=>{for(let o=0;o<30;o++){let s=o/29,c=Math.round(e+(r-e)*s),l=Math.round(n+(i-n)*s),u=s<.1||s>.9;for(let e=-1;e<=1;e++)for(let n=-1;n<=1;n++)if(!(!u&&Math.abs(e)+Math.abs(n)>1))for(let r=0;r<(u?3:2);r++)t.set(c+e,3+r+a,l+n,fy(r===0?_y.boneLo:c+l&1?_y.bone:16051928,c+e,r,l+n,35,.03))}};return n(4,5,27,26,0),n(4,26,27,5,1),R(t,16,1,16,e,py)}var Dy={tigerskin:yy,tigerclaw:Sy,raptorskin:by,raptorclaw:Cy,scimitar:wy,pirategold:Ty,piratebone:Ey},Oy=(e,t,n,r,i=0,a=.05)=>U(e,a,l(t,n,r,i)),ky=.06;function Ay(e){let t=new W(18,20,6);for(let e=0;e<18;e++){let n=e/17,r=n<.55?3+n*8:7.4*(1-(n-.55)/.5);for(let i=0;i<18;i++){let a=Math.abs(i+.5-9);if(a>r)continue;let o=a>r-1.4||e<1,s=1+ +!o+ +(a<1.2&&!o)+ +(a<1.2&&e>5&&e<14),c=o?Me.scaleLo:n>.6?Me.scaleHi:Me.scale;for(let n=0;n<s+1;n++)t.set(i,e+1,n,Oy(n===s?c:Me.scaleLo,i,e,n,1))}}for(let e=4;e<12;e++)t.set(9,e+1,4,Me.vein,!0);return R(t,9,10,3,e,ky)}function jy(e){let t=new W(14,26,14);for(let e=0;e<24;e++){let n=e/23,r=4.4*(1-n)**.8+.5,i=Math.round(n*n*3.5);for(let n=0;n<14;n++)for(let a=0;a<14;a++){let o=Math.hypot(n+.5-7,a+.5-7-i);if(o>r)continue;let s=e<5?Me.hornDark:Me.tooth,c=o>r-.9&&e>4?Me.claw:s;t.set(n,e+1,a,Oy(c,n,e,a,2,.04))}}for(let e=0;e<5;e++)for(let n=0;n<14;n++)for(let r=0;r<14;r++){let i=Math.hypot(n+.5-7,r+.5-7);i<5.1&&i>4.1&&t.set(n,e+1,r,Oy(Me.mouth,n,e,r,3,.04))}return R(t,7,13,7,e,ky)}function My(e){let t=new W(24,22,8);for(let e=0;e<26;e++){let n=e/25,r=n*1.5,i=Math.round(5+Math.sin(r)*15),a=Math.round(2+(1-Math.cos(r))*15),o=Math.max(.6,3.4*(1-n)+.5);for(let e=-3;e<=3;e++)for(let r=-3;r<=3;r++)for(let s=0;s<6;s++){if(Math.hypot(e,r,(s-2.5)*1.1)>o*.9)continue;let c=n<.14?Me.scaleLo:s<2?Me.hornDark:Me.claw;t.set(i+e,a+r,s+1,Oy(c,i+e,a+r,s,4,.03))}}return R(t,12,11,4,e,ky)}function Ny(e){let t=new W(22,30,14);for(let e=0;e<34;e++){let n=e/33,r=n*1.15,i=Math.round(4+Math.sin(r)*16),a=Math.round(2+(1-Math.cos(r*1.05))*24*.95),o=4.1*(1-n)**.9+.6,s=e%5==0;for(let e=-5;e<=5;e++)for(let r=-5;r<=5;r++)for(let c=-5;c<=5;c++){if(Math.hypot(e,r*.8,c)>o)continue;let l=s?Me.hornDark:n<.1?Me.bellyDark:n>.8?Me.tooth:Me.horn;t.set(i+e,a+r,6+c,Oy(l,i+e,a+r,c,5,.035))}}return R(t,11,14,7,e,ky)}function Py(e,t=Me){let n=new W(24,22,6);for(let e=0;e<18;e++)for(let r=0;r<22;r++){let i=Math.sin(r*.6)*1.1+Math.cos(e*.5)*.8,a=Math.abs(r+.5-11)/10,o=Math.abs(e+.5-9)/8;if(a**3+o**3>1+i*.06)continue;let s=(a>.82||o>.8)&&(r+e)%2==0,c=(r+(e>>1&1)*2)%4<2,l=s?t.horn:c?t.scaleLo:Fy(r,e,t);n.set(r,e+1,0,Oy(l,r,e,0,6,.05)),n.set(r,e+1,1,Oy(s?t.hornDark:t.scaleLo,r,e,1,7,.05)),!s&&a<.86&&o<.84&&!c&&n.set(r,e+1,2,Oy(t.scale,r,e,2,8,.05))}return R(n,11,10,2,e,ky)}var Fy=(e,t,n)=>(e+t)%5==0?n.scaleHi:n.scale;function Iy(e){let t=new W(18,20,6);for(let e=0;e<18;e++){let n=e/17,r=n<.5?2.6+n*9:7.1*(1-(n-.5)/.55);for(let i=0;i<18;i++){let a=Math.abs(i+.5-9);if(a>r)continue;let o=a>r-1.4||e<1,s=1+ +!o+ +(a<1.2&&!o),c=o?Qt.scaleLo:n>.6?Qt.scaleHi:Qt.scale;for(let n=0;n<s+1;n++)t.set(i,e+1,n,Oy(n===s?c:Qt.scaleLo,i,e,n,11))}}for(let e=3;e<13;e++)t.set(9,e+1,4,e%3==0?Qt.glowHi:Qt.glow,!0);return R(t,9,10,3,e,ky)}function Ly(e){let t=new W(24,22,8);for(let e=0;e<26;e++){let n=e/25,r=n*1.5,i=Math.round(5+Math.sin(r)*15),a=Math.round(2+(1-Math.cos(r))*15),o=Math.max(.6,3.4*(1-n)+.5);for(let e=-3;e<=3;e++)for(let r=-3;r<=3;r++)for(let s=0;s<6;s++){if(Math.hypot(e,r,(s-2.5)*1.1)>o*.9)continue;let c=n<.14?Qt.scaleLo:n>.55?Qt.claw:s<2?Qt.bladeDark:Qt.blade;t.set(i+e,a+r,s+1,Oy(c,i+e,a+r,s,12,.03))}}return R(t,12,11,4,e,ky)}function Ry(e){let t=new W(26,30,12);for(let e=0;e<40;e++){let n=e/39,r=n*1.35,i=Math.round(3+Math.sin(r)*18),a=Math.round(2+(1-Math.cos(r))*22),o=3.6*(1-n)**.8+.5;for(let r=-4;r<=4;r++)for(let s=-4;s<=4;s++)for(let c=-2;c<=2;c++){if(Math.hypot(r,s,c*1.6)>o)continue;let l=s<-o*.35&&n>.15,u=n<.1?Qt.scaleLo:l?Qt.edge:e%6==0?Qt.bladeDark:Qt.blade;t.set(i+r,a+s,6+c,Oy(u,i+r,a+s,c,13,.03))}e>8&&e%9==0&&t.set(i,a,6,Qt.glow,!0)}return R(t,12,14,6,e,ky)}function zy(e,t=Qt){let n=new W(26,22,6);for(let e=0;e<18;e++)for(let r=0;r<24;r++){let i=Math.abs(r+.5-12)/11,a=(e+.5)/18,o=.08*Math.abs(Math.sin(r*.7));i**2.4+(a-.5+o*.5)**2*3.4>1||(n.set(r,e+1,0,Oy(i>.8?t.membraneHi:t.membrane,r,e,0,14,.05)),n.set(r,e+1,1,Oy(t.membrane,r,e,1,15,.05)))}for(let e of[4,9,12,15,20])for(let r=1;r<17;r++){let i=(r+e)%4==0;n.set(e,r+1,2,i?t.glow:t.membraneHi,i)}for(let e=2;e<22;e++)n.set(e,1,2,Oy(t.scaleHi,e,0,2,16,.04));return R(n,12,10,2,e,ky)}function By(e){let t=new W(18,22,18);for(let e=0;e<20;e++)for(let n=0;n<18;n++)for(let r=0;r<18;r++){let i=(n+.5-9)/6.6,a=(r+.5-9)/6.6,o=(e-10)/(9.8-Math.abs(e-10)*.2),s=Math.abs(i)+Math.abs(a)+Math.abs(o)*.7;if(s>1.15)continue;let c=s>.82;t.set(n,e+1,r,Oy(c?Qt.glow:Qt.glowHi,n,e,r,17,.04),!c)}for(let[e,n,r]of[[0,0,0],[1,0,0],[0,1,0],[0,0,1]])t.set(9+e,11+n,9+r,16777215,!0);for(let e=0;e<3;e++)for(let n=5;n<13;n++)for(let r=5;r<13;r++)(n+r+e)%3!=0&&Math.hypot(n-8.5,r-8.5)<4.3-e&&t.set(n,e,r,Oy(Qt.scaleLo,n,e,r,18,.04));return R(t,9,11,9,e,ky)}function Vy(e){let t=new W(24,22,8),n=[d.furLo,d.fur,d.furHi,d.furWhite];for(let e=1;e<23;e++){let r=3+Math.round(Math.sin(e*.55)*1.2)+(l(e,1,0,61)>.45?2+Math.floor(l(e,2,0,62)*9):1+Math.floor(l(e,3,0,63)*3))+Math.round(Math.sin(e*.28)*3+4);for(let i=1;i<r;i++)for(let a=1;a<6;a++){let o=i/r,s=a===1||a===5;if(a!==3&&Math.abs(a-3)+ +(o>.8)>2)continue;let c=o>.82?d.furWhite:o>.55?d.furHi:s?d.furLo:n[1+(e+i)%2];t.set(e,i,a,Oy(c,e,i,a,61,.04))}}for(let e=3;e<21;e+=4)for(let n=2;n<5;n++)t.set(e,n,3,d.ice,!0);return R(t,12,8,3,e,ky)}function Hy(e){let t=new W(26,24,8);for(let e=0;e<28;e++){let n=e/27,r=n*1.5,i=Math.round(5+Math.sin(r)*16),a=Math.round(2+(1-Math.cos(r))*17),o=Math.max(.6,3.8*(1-n)+.5);for(let e=-3;e<=3;e++)for(let r=-3;r<=3;r++)for(let s=0;s<6;s++){if(Math.hypot(e,r,(s-2.5)*1.1)>o*.9)continue;let c=n<.14?d.furLo:n>.7?d.clawTip:s<2?d.clawDark:d.claw;t.set(i+e,a+r,s+1,Oy(c,i+e,a+r,s,62,.03))}}return R(t,13,12,4,e,ky)}function Uy(e){let t=new W(14,28,14);for(let e=0;e<26;e++){let n=e/25,r=4.6*(1-n)**.8+.5,i=Math.round(n*n*3);for(let n=0;n<14;n++)for(let a=0;a<14;a++){let o=Math.hypot(n+.5-7,a+.5-7-i);if(o>r)continue;let s=e<5?d.furHi:o>r-.9&&e>4?d.fangLo:d.fang;t.set(n,e+1,a,Oy(s,n,e,a,63,.035))}}for(let e=0;e<5;e++)for(let n=0;n<14;n++)for(let r=0;r<14;r++){let i=Math.hypot(n+.5-7,r+.5-7);i<5.3&&i>4.2&&t.set(n,e+1,r,Oy(l(n,e,r,64)>.5?d.furWhite:d.fur,n,e,r,64,.04))}return R(t,7,13,7,e,ky)}function Wy(e){let t=new W(18,32,18);for(let e=0;e<30;e++){let n=e/29,r=(e<4?3.2+e*.5:5.2*(1-(n-.14)/.86))+.4,i=Math.round(n*n*2);for(let n=0;n<18;n++)for(let a=0;a<18;a++){let o=n+.5-9-i,s=a+.5-9;if(Math.abs(o)+Math.abs(s)>r*1.25)continue;let c=Math.abs(o)+Math.abs(s)>r*1.25-1.3,l=Math.abs(o)+Math.abs(s)<r*.45;t.set(n,e+1,a,l&&e>3?Oy(d.glow,n,e,a,65,.03):Oy(c?d.iceHi:e%5<2?d.ice:d.iceDeep,n,e,a,66,.04),l&&e>3)}}return R(t,9,15,9,e,ky)}function Gy(e){let t=new W(20,24,20);for(let e=0;e<22;e++)for(let n=0;n<20;n++)for(let r=0;r<20;r++){let i=(n+.5-10)/7,a=(r+.5-10)/7,o=(e-11)/(10-Math.abs(e-11)*.15),s=Math.abs(i)+Math.abs(a)+Math.abs(o)*.75;if(s>1.15)continue;let c=s>.8;t.set(n,e+1,r,Oy(c?d.glow:d.glowHi,n,e,r,67,.04),!c)}for(let e=0;e<4;e++)for(let n=5;n<15;n++)for(let r=5;r<15;r++)(n+r+e)%3!=0&&Math.hypot(n-9.5,r-9.5)<5.2-e&&t.set(n,e,r,Oy(l(n,e,r,68)>.5?d.furHi:d.fur,n,e,r,68,.04));for(let[e,n,r]of[[0,0,0],[1,0,0],[0,1,0],[0,0,1]])t.set(10+e,12+n,10+r,16777215,!0);return R(t,10,12,10,e,ky)}var Ky={scale:10139860,scaleLo:6128812,scaleHi:14478584,horn:d.leather,hornDark:d.leatherLo},qy={scale:3879528,scaleLo:2432840,scaleHi:5721244,horn:Qt.trim,hornDark:Qt.bladeDark},Jy={membrane:Me.membrane,membraneHi:Me.membraneHi,glow:Me.vein,scaleHi:Me.scaleHi},Yy={...Dy,budgemembrane:e=>zy(e,Jy),yetihide:e=>Py(e,Ky),rimefur:Vy,glacierclaw:Hy,yetifang:Uy,frostshard:Wy,frostheart:Gy,duskhide:e=>Py(e,qy),budgescale:Ay,budgefang:jy,budgeclaw:My,budgehorn:Ny,budgehide:Py,duskscale:Iy,duskclaw:Ly,scythehorn:Ry,gloommembrane:zy,gloomcore:By},Xy={};function Zy(e){return Yy[e]?(Xy[e]||(Xy[e]=Yy[e](at({vertexColors:!0}))),Xy[e].clone()):null}var Qy=()=>new a({color:855828});function $y(e){e?.parent?.remove(e)}function eb(e,t){let n=new V,r=.6,i=.26;if(e.kind===`monster`){let t=oy[e.id]();n.add(t.root),r=e.id===`wraith`?.35:.65}else if(e.kind===`material`){let t=Zy(e.id);n.add(t),n.rotation.z=e.id===`budgefang`?-.35:e.id===`duskclaw`?-.2:0,r=.55,i=.18}else if(e.kind===`good`){let[t,a,o,s,c]=qs(e.id);n.add(R(t,o,s,c,at({vertexColors:!0}),a));let l=Ft(e.id);r=l?.75:.6,i=l?.3:.24}else if(e.kind===`weapon`){let t=ne(e.id),a=I(t.held);if(Vt.has(t.held))r=.85,n.rotation.z=-.32;else if(t.wtype===`crossbow`){a.rotation.z=Math.PI;let e=new V;e.rotation.x=-Math.PI/2,e.add(a),n.rotation.z=-.4,n.add(e),r=.25,i=.1}else a.rotation.x=-Math.PI/2,n.rotation.z=-.55,r=.4,i=.12;t.wtype!==`crossbow`&&n.add(a)}else if(e.kind===`armor`&&ne(e.id)?.slot===`quiver`){let[e,t,a,o,s]=qs(`quiver`);n.add(R(e,a,o,s,at({vertexColors:!0}),t)),r=.5,i=.2}else if(e.kind===`armor`&&(ne(e.id).slot===`shield`||ne(e.id).slot===`book`)){let t=ne(e.id),a=at({vertexColors:!0});if(t.slot===`shield`){let e=ft(t.set),o=R(e.M,e.ox,e.oy,e.oz,a,e.size);o.rotation.x=Math.PI/2,n.add(o),r=.5,i=.12}else{let e=Rt(t.set),o=R(e.M,e.ox,e.oy,e.oz,a,e.size);o.rotation.x=Math.PI/2,o.rotation.z=-.3,n.add(o),r=.45,i=.1}}else if(e.kind===`armor`){let t=ne(e.id),a={helm:[`head`],chest:[`torso`],arms:[`armL`,`armR`],legs:[`legL`,`legR`],boots:[`legL`,`legR`]}[t.slot],o=Le({armor:{[t.slot]:t.set},parts:a,...t.slot===`helm`?{}:{hero:!1}});for(let e of[`head`,`torso`,`armL`,`armR`,`legL`,`legR`])a.includes(e)||$y(o[e]);o.shieldG?.parent?.remove(o.shieldG),n.add(o.root),r=t.slot===`arms`?.5:.55,i=t.slot===`legs`||t.slot===`boots`?.12:.2}else if(e.kind===`held`){let t=e.id,a=I(t);if(Vt.has(t))r=.85,n.rotation.z=-.32,n.add(a);else if(String(t).includes(`crossbow`)){a.rotation.z=Math.PI;let e=new V;e.rotation.x=-Math.PI/2,e.add(a),n.rotation.z=-.4,n.add(e),r=.25,i=.1}else a.rotation.x=-Math.PI/2,n.rotation.z=-.55,r=.4,i=.12,n.add(a)}else if(e.kind===`hunter`){let t=Le({armor:e.armor||{}});e.armor?.shield?(t.shieldG.visible=!0,t.armL.rotation.set(-.75,0,.35)):e.armor?.book&&t.armL.rotation.set(-.55,.15,.2),e.held&&(t.armR.rotation.x=-.85,t.heldSlot.rotation.z=Ge(e.held),t.heldSlot.add(I(e.held))),n.add(t.root),r=.55,i=.16}else if(e.kind===`set`){let t=cn(e.id).tier===`metal`?`shield`:cn(e.id).tier===`cloth`?`book`:null,a=Le({armor:Object.fromEntries([...g,...t?[t]:[]].map(t=>[t,e.id]))});a.armR.rotation.x=-.9,a.heldSlot.rotation.z=Ge(ub[e.id]),t===`shield`?(a.shieldG.visible=!0,a.armL.rotation.set(-.75,0,.35)):a.shieldG?.parent?.remove(a.shieldG),a.heldSlot.add(I(ub[e.id])),n.add(a.root),r=.5,i=.14}let a=new V;a.add(n),a.updateMatrixWorld(!0);let o=new de().setFromObject(a).getCenter(new jt);n.position.sub(o),a.updateMatrixWorld(!0);let s=new de().setFromObject(a).getBoundingSphere(new ze);if(t){let e=Qy();a.traverse(t=>{t.isMesh&&(t.material=e,t.castShadow=!1)})}let c=e.kind===`monster`?e.id===`volcanum`?.52:e.id===`darksycledragon`?.78:e.id===`snowyeti`?.74:e.id===`tiger`||e.id===`raptor`?.78:e.id===`demonknight`||e.id===`holyknight`?.7:.82:e.kind===`set`||e.kind===`hunter`?.9:1;return{spin:a,radius:Math.max(.1,s.radius*c),yaw:r,pitch:i}}function tb(e){e.spin.traverse(e=>{e.isMesh&&e.geometry&&e.geometry.dispose()})}var nb=class{constructor(){this.renderer=new ba({antialias:!0,alpha:!0,preserveDrawingBuffer:!0,powerPreference:`low-power`}),this.renderer.outputColorSpace=Pe,this.renderer.toneMapping=6,this.renderer.toneMappingExposure=1.05,this.renderer.setClearColor(0,0),this.scene=new M,this.camera=new E(28,1,.05,200),this.scene.add(new Mt(16777215,9082541,1.25));let e=new et(16773852,2.6);e.position.set(3,5,4);let t=new et(12112127,.9);t.position.set(-4,2,-3),this.scene.add(e,t),this.cache=new Map,this.queue=[],this.pumping=!1}draw(e,t,n,r,i){let a=this.renderer;(a.domElement.width!==r||a.domElement.height!==i)&&a.setSize(r,i,!1);let o=this.camera;o.aspect=r/i;let s=o.fov*Math.PI/180,c=2*Math.atan(Math.tan(s/2)*o.aspect),l=e.radius/Math.sin(Math.min(s,c)/2)*1.04,u=Math.cos(e.pitch);o.position.set(0,Math.sin(e.pitch)*l,u*l),o.lookAt(0,0,0),o.updateProjectionMatrix(),e.spin.rotation.y=t,this.scene.add(e.spin),a.render(this.scene,o),this.scene.remove(e.spin),n.clearRect(0,0,n.canvas.width,n.canvas.height),n.drawImage(a.domElement,0,0,n.canvas.width,n.canvas.height)}thumb(e,t,n=192){let r=`${e.kind}:${e.id||``}:${+!!t}`,i=document.createElement(`canvas`);i.width=n,i.height=n;let a=i.getContext(`2d`),o=this.cache.get(r);return o?a.drawImage(o,0,0,n,n):this.queue.push({key:r,spec:e,silhouette:t,ctx:a,px:n}),i}thumbNow(e,t=64){let n=`${e.kind}:${e.id||``}:0`,r=this.cache.get(n);if(!r){let t=eb(e,!1);r=document.createElement(`canvas`),r.width=192,r.height=192,this.draw(t,t.yaw,r.getContext(`2d`),192,192),tb(t),this.cache.set(n,r)}let i=document.createElement(`canvas`);return i.width=t,i.height=t,i.getContext(`2d`).drawImage(r,0,0,t,t),i}cancel(){this.queue.length=0}pending(){return this.queue.length>0}run(e){try{let t=this.cache.get(e.key);if(!t){let n=eb(e.spec,e.silhouette),r=document.createElement(`canvas`);r.width=192,r.height=192,this.draw(n,n.yaw,r.getContext(`2d`),192,192),tb(n),this.cache.set(e.key,r),t=r}e.ctx&&(e.ctx.clearRect(0,0,e.px,e.px),e.ctx.drawImage(t,0,0,e.px,e.px))}catch(t){console.warn(`catalog thumb failed`,e.key,t)}}flush(e=14){let t=performance.now(),n=0;for(;this.queue.length&&(n<1||performance.now()-t<e);)this.run(this.queue.shift()),n++;this.queue.length&&!this.pumping&&(this.pumping=!0,requestAnimationFrame(()=>{this.pumping=!1,this.flush()}))}},rb=null,ib=()=>rb||(rb=new nb);function ab(e,t=64){return ib().thumb(e,!1,t)}function ob(e,t=64){return ib().thumbNow(e,t)}function sb(e=80){ib().flush(e)}var cb={Common:`common`,Uncommon:`uncommon`,Rare:`rare`},lb=e=>String(e).replace(/[&<>"]/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`})[e]);function $(e,t,n){let r=document.createElement(e);return t&&(r.className=t),n!==void 0&&(r.innerHTML=n),r}var ub={budgeset:`budgeblade`,darksyceset:`darkscythe`,budgeleather:`budgecrossbow`,darkleather:`darkcrossbow`,budgecloth:`budgestaff`,darkcloth:`darkstaff`,yetiset:`yetigreatsword`,yetileather:`yeticrossbow`,yeticloth:`yetistaff`,tigerleather:`tigerspear`,tigercloth:`tigerclaws`,raptorleather:`raptorcrossbow`,raptorcloth:`raptorsaber`,pirateset:`piratecutlass`,piratecloth:`bonestaff`,demonset:`demonsword`,holyset:`holyhammer`,...Object.fromEntries(Ue.map(e=>[e.setId,`${e.id}sword`]))},db={demonset:`Jagged black plate lit by cracks of red: a spike-crowned helm with burning eyes, a shard-layered cuirass with a row of spikes across the back, spiked gauntlets under huge pauldrons, spiked greaves and sabatons, with a demon-faced bulwark. Dropped whole, and rarely, by the Demon Knight. The warrior set.`,holyset:`White plate trimmed in gold and marked with glowing blue crosses: a horned, gold-crested helm, a cross-bearing cuirass, gold-rimmed gauntlets, diamond-framed greaves and large sabatons. Dropped whole, and rarely, by the Holy Knight. The warrior set.`,...Object.fromEntries(Ue.map(e=>[e.setId,kt(e)])),budgeset:`Dragon-scale plate: a horned helm, gilded cuirass, clawed gauntlets, banded greaves and talon boots, with a horn-bossed shield. The warrior set.`,darksyceset:`Five pieces of indigo scale lit from within by gloom: a sickle-horned helm, a core-burning cuirass, scythe-pauldron gauntlets, rune greaves and silent talon boots, with a gloom-gem shield. The warrior set.`,budgeleather:`Laced hide in budge green with bone-stud trim: a horn-stud cap, jerkin, bracer gloves, strapped leggings and claw-toed boots. Light and quiet. The ranger set.`,budgecloth:`Wing-silk robes in budge green and gold: a pointed hood, sashed robe, flared cuffs, tied trousers and curled slippers, plus a fang-clasped grimoire. The mage set.`,darkleather:`Indigo hide stitched with violet thread: a finned cowl, jerkin, talon bracers, strapped leggings and talon-capped boots. Built for shadows. The ranger set.`,darkcloth:`Dusk-silk robes with glowing hems: a gem-browed hood, core-clasped robe, flared cuffs, sashed trousers and silent slippers, plus a humming grimoire. The mage set.`,yetiset:`Frost-shard plate under rime fur and brown leather straps: a crystal-crested yeti helm with glowing eyes, a frostheart cuirass, claw-knuckled gauntlets, heavy greaves and ice-clawed boots, with a glacier shield. The warrior set.`,yetileather:`Frost-stiff yeti hide with shaggy collars and crossed straps: a fur hood, jerkin, claw-bracer gloves, banded leggings and deep-furred boots. Built for the long cold. The ranger set.`,tigerleather:`Orange hide banded in black: a tiger-eared cowl, a striped jerkin with a white fur ruff, claw-bracer gloves, banded leggings and white paw-toed boots. Quiet, quick and unmistakable. The ranger set.`,tigercloth:`Orange robes striped in black with a white collar: an eared hood, claw-clasped robe, pale-edged cuffs, striped trousers and white-toed slippers, plus a grimoire with a watchful yellow eye. The mage set.`,raptorleather:`Olive and tan mosaic hide with grey spike ridges: a crested cowl, a laced jerkin with spiked shoulders, sickle-claw gloves, scaled leggings and three-toed boots. Built for the pack hunt. The ranger set.`,raptorcloth:`Robes woven in an olive and tan scale mosaic with grey spiked collars: a small-crested hood, flared cuffs, mosaic trousers and scaled slippers, plus a claw-clasped grimoire with an orange eye. The mage set.`,pirateset:`Navy plate cut like a captain's coat: a gold-trimmed tricorn over a red bandana, a gold-buttoned coat with a buckled belt, gold-cuffed gauntlets, strapped greaves and gold-buckled boots, with a round skull-boss buckler. The warrior set.`,piratecloth:`A black and red coat robe with bone buttons and bone-and-gold trim: a knotted bandana hood, flared red cuffs, bone-toggled trousers and black slippers, plus a logbook with a glowing green skull clasp. The mage set.`,yeticloth:`Layered rime-fur robes with frost-silk sashes and a hem of icicles: a shard-browed hood, frostheart-clasped robe, flared cuffs, sashed trousers and silent slippers, plus a frost-rimed grimoire. The mage set.`};function fb(e){let t=[];return e.mana&&t.push(`+${e.mana} spirit`),e.spell&&t.push(`+${Math.round(e.spell*100)}% spell`),t.join(`, `)}var pb=class{constructor(e){this.game=e,this.tab=`monsters`,this.view=null,this.body=null,this.viewer=null}get progress(){return this.game.progress}snapshot(e,t=768,n=null,r=null){let i=eb(e,!1);r!==null&&(i.pitch=r);let a=document.createElement(`canvas`);return a.width=t,a.height=t,ib().draw(i,n??i.yaw,a.getContext(`2d`),t,t),tb(i),a.toDataURL(`image/png`)}mount(e,t={}){return this.body=e,this.forge=!!t.forge,this.forge&&this.tab===`monsters`&&(this.tab=`weapons`),this.view=null,this.render(),()=>this.unmount()}unmount(){this.stopViewer(),this.body=null}stopViewer(){this.viewer&&(cancelAnimationFrame(this.viewer.raf),tb(this.viewer.subject),this.viewer=null)}goto(e,t){t&&(this.tab=t),this.view=e,this.render(),this.body?.parentElement?.scrollTo?.(0,0)}render(){this.body&&(this.stopViewer(),ib().cancel(),this.body.innerHTML=``,this.game.hud.el.panelTitle.textContent=this.forge?`The Forge`:`Hunter Catalog`,this.view?this.renderDetail(this.view):this.renderGrid(),ib().flush(120))}renderGrid(){let e=this.progress,t=$(`div`,`cat`),n=pt.filter(t=>e.seen(t.id)).length,r=$(`div`,`cat-tabs`),i=[[`monsters`,`Monsters`,`${n}/${pt.length}`],[`weapons`,`Weapons`,`${o().filter(t=>e.crafted(t.id)).length}/${o().length}`],[`armor`,`Armor`,`${D().filter(t=>e.crafted(t.id)).length}/${D().length}`]];for(let[e,t,n]of i){let i=$(`button`,`cat-tab`+(this.tab===e?` on`:``),`${t}<small>${n}</small>`);i.type=`button`,i.onclick=()=>{this.tab=e,this.render()},r.appendChild(i)}t.appendChild(r),this.forge&&(t.appendChild($(`div`,`cat-forge`,`<b>Bram the Blacksmith</b> Bars from the smithy become armor and weapons of that metal, plus iron arrowheads. Each piece wants a Smithing level. Fletch a shaft with a feather and an arrowhead here, then wear a quiver. The carving knife is already in your bag.`)),t.appendChild(this.forgeBench()));let a=$(`div`,`cat-grid`),s=ib();if(this.tab===`monsters`)for(let t of pt){let n=e.seen(t.id),r=this.card(s.thumb({kind:`monster`,id:t.id},!n),n?t.name:`???`,n?`Lv ${t.level}  -  ${e.kills(t.id)} slain`:`Undiscovered`,n?``:`locked`);r.onclick=()=>this.goto({type:`monster`,id:t.id}),a.appendChild(r)}else if(this.tab===`weapons`){let t=o(`smith`);for(let e of Ue){let n=t.filter(t=>t.metal===e.id);if(n.length){a.appendChild(this.heading(`${e.name} smithing`));for(let e of n)a.appendChild(this.gearCard(e))}}for(let t of pt){let n=o(t.id);if(n.length){a.appendChild(this.heading(e.seen(t.id)?t.name:`???`));for(let e of n)a.appendChild(this.gearCard(e))}}}else for(let t of ae){let n=D(t.id),r=n.filter(t=>e.crafted(t.id)).length,i=t.monster===`smith`,o=i||e.seen(t.monster),c=e.setComplete(t.id),l=i?t.name.replace(/ Plate$/,``)+` smithing`:Se(t.monster).name;a.appendChild(this.heading(o?`${l} - ${ve[t.tier]} (${t.role})`:`???`));let u=this.card(s.thumb({kind:`set`,id:t.id},!o),o?t.name:`???`,o?`${r}/${n.length} pieces${c?`  -  Complete`:``}`:`Undiscovered`,(o?`set`:`locked`)+(c?` worn`:``));u.onclick=()=>this.goto({type:`set`,id:t.id}),a.appendChild(u);for(let e of n)a.appendChild(this.gearCard(e))}t.appendChild(a),t.appendChild($(`p`,`cat-foot`,`Defeat monsters to discover them and collect parts. Bring parts to the Forge in Oakhollow to craft weapons and armor you can wear into the field.`)),this.body.appendChild(t)}heading(e){return $(`h4`,`cat-sub`,lb(e))}card(e,t,n,r=``,i=``){let a=$(`button`,`cat-card `+r);a.type=`button`;let o=$(`div`,`cat-thumb`);return o.appendChild(e),a.appendChild(o),a.appendChild($(`b`,null,lb(t))),a.appendChild($(`small`,null,lb(n))),i&&a.appendChild($(`span`,`cat-badge`,i)),a}gearCard(e){let t=this.progress,n=t.gearSeen(e),r=t.crafted(e.id),i=``,a=n?``:`locked`;t.worn(e.id)?(i=`Equipped`,a+=` worn`):r?i=`Crafted`:n&&t.canCraft(e)&&(i=`Craftable`,a+=` ready`);let o=n?e.type===`weapon`?`${y[e.wtype]}  -  Dmg ${e.item.dmg}`:`${le[e.slot]}  -  Def ${e.def}`:`Undiscovered`,s={kind:e.type===`weapon`?`weapon`:`armor`,id:e.id},c=this.card(ib().thumb(s,!n),n?e.name:`???`,o,a,i);return c.onclick=()=>this.goto({type:`gear`,id:e.id}),c}renderDetail(e){let t=this.progress,n=$(`div`,`cat`),r=$(`button`,`cat-back`,`&lt; Back to catalog`);r.type=`button`,r.onclick=()=>this.goto(null),n.appendChild(r);let i=$(`div`,`cat-detail`),a=$(`div`,`cat-viewer`),o=document.createElement(`canvas`);a.appendChild(o),a.appendChild($(`span`,`cat-hint`,`Drag to rotate`));let s=$(`div`,`cat-info`);i.append(a,s),n.appendChild(i),this.body.appendChild(n);let c,l;if(e.type===`monster`){let n=Se(e.id);l=t.seen(n.id),c={kind:`monster`,id:n.id},this.fillMonster(s,n,l)}else if(e.type===`set`){let n=cn(e.id);l=n.monster===`smith`||t.seen(n.monster),c={kind:`set`,id:n.id},this.fillSet(s,n,l)}else{let n=ne(e.id);l=t.gearSeen(n),c={kind:n.type===`weapon`?`weapon`:`armor`,id:n.id},this.fillGear(s,n,l)}this.startViewer(o,c,!l)}fillMonster(e,t,n){let r=this.progress;if(!n){e.innerHTML=`<h3>???</h3><p class="cat-muted">You have not encountered this creature yet. Keep hunting around Goldenmeadow and the forest edge.</p>`;return}let i=sy[t.id];e.innerHTML=`<h3>${lb(t.name)}</h3>
      <div class="cat-tags"><span>Lv ${t.level}</span><span>${lb(t.temper)}</span><span>${lb(t.style)}</span><span>${r.kills(t.id)} slain</span></div>
      <p>${lb(t.desc)}</p>
      <div class="cat-stats"><div><small>Health</small><b>${i.hp}</b></div><div><small>Attack</small><b>${i.dmg}</b></div><div><small>Speed</small><b>${i.speed}</b></div></div>
      <p class="cat-muted">Habitat: ${lb(t.habitat)}</p>`,t.lore&&e.appendChild($(`p`,`cat-muted`,lb(t.lore)));let a=qe[t.id];if(a){e.appendChild($(`h4`,null,`Drops (whole pieces only, no parts)`));let t=$(`div`,`cat-made`);for(let e of a){let n=ne(e.id),i=$(`button`,`cat-mini`+(r.crafted(n.id)?` done`:``));i.type=`button`,i.appendChild(ib().thumb({kind:n.type===`weapon`?`weapon`:`armor`,id:n.id},!1,96)),i.appendChild($(`span`,null,`${lb(n.name)} <small>${Math.round(e.chance*1e3)/10}%</small>`)),i.onclick=()=>this.goto({type:`gear`,id:n.id},n.type===`weapon`?`weapons`:`armor`),t.appendChild(i)}e.appendChild(t)}let o=f[t.id];if(o){e.appendChild($(`h4`,null,`Drops`));let n=$(`div`,`cat-parts`);for(let e of o)if(gt[e.id])n.appendChild(this.partChip(e.id,`${e.rate}`,cb[e.rate],!0));else{let t=this.goodChip(e.id,e.rate);t.appendChild($(`em`,null,`x${r.good(e.id)}`)),n.appendChild(t)}e.appendChild(n);let i=pe.filter(e=>e.monster===t.id);if(!i.length)return;e.appendChild($(`h4`,null,`Can be crafted into`));let a=$(`div`,`cat-made`);for(let e of i){let t=$(`button`,`cat-mini`+(r.crafted(e.id)?` done`:``));t.type=`button`,t.appendChild(ib().thumb({kind:e.type===`weapon`?`weapon`:`armor`,id:e.id},!1,96)),t.appendChild($(`span`,null,lb(e.name))),t.onclick=()=>this.goto({type:`gear`,id:e.id},e.type===`weapon`?`weapons`:`armor`),a.appendChild(t)}e.appendChild(a)}}partChip(e,t,n,r){let i=this.progress,a=$(`div`,`cat-part`);a.title=gt[e].desc,a.appendChild(ib().thumb({kind:`material`,id:e},!1,96));let o=$(`div`);return o.innerHTML=`<b>${lb(gt[e].name)}</b><small class="${n||``}">${lb(t)}</small>`,a.appendChild(o),r&&a.appendChild($(`em`,null,`x${i.count(e)}`)),a}recipeChips(e){let t=this.progress,n=$(`div`,`cat-parts`),r=[...i.filter(t=>e.recipe[t]),...Object.keys(e.recipe).filter(e=>!gt[e])];for(let i of r){let r=e.recipe[i],a=t.stockOf(i),o=gt[i]?this.partChip(i,`Need ${r}`,``,!1):this.goodChip(i,`Need ${r}`);o.appendChild($(`em`,a>=r?`ok`:`short`,`${a}/${r}`)),n.appendChild(o)}return n}goodChip(e,t){let n=$(`div`,`cat-part`);n.title=_e[e]?.desc||e,n.appendChild(ib().thumb({kind:`good`,id:e},!1,96));let r=$(`div`);return r.innerHTML=`<b>${lb(_e[e]?.name||e)}</b><small>${lb(t)}</small>`,n.appendChild(r),n}forgeBench(){let e=this.progress,t=$(`div`,`smith-bench`),n=(e,t,n)=>{let r=$(`div`,`smith-row`),i=$(`div`);i.innerHTML=`<b>${lb(e)}</b><small>${lb(t)}</small>`,r.appendChild(i);let a=$(`div`,`smith-acts`);for(let e of n){let t=$(`button`,`cat-btn`+(e.on?` go`:``),lb(e.label));t.type=`button`,t.disabled=!e.on,t.onclick=e.run,a.appendChild(t)}return r.appendChild(a),r},r=e.good(`iron_bar`),i=e.good(`arrowhead`),a=e.good(`feather`);t.appendChild(n(`Arrowheads`,`1 iron bar makes 15. You have ${r} ${r===1?`bar`:`bars`} and ${i} heads.`,[{label:`Forge 15`,on:r>=1,run:()=>this.madeHeads(!1)},{label:`Forge all`,on:r>=1,run:()=>this.madeHeads(!0)}]));for(let r of fe){let o=e.good(r),s=Math.min(i,o,a),c=_e[r].name.toLowerCase();t.appendChild(n(`Fletch ${c}s`,`1 arrowhead, 1 shaft and 1 feather. ${i} heads, ${o} shafts, ${a} feathers.`,[{label:`Make 1`,on:s>=1,run:()=>this.madeArrows(r,!1)},{label:`Make all`,on:s>=1,run:()=>this.madeArrows(r,!0)}]))}return t}madeHeads(e){let t=this.progress.forgeHeads(e);t&&(this.game.audio.quest(),this.game.hud.toast(`Forged ${t} arrowheads`,1600),this.sparkForge(),this.render())}madeArrows(e,t){let n=this.progress.fletchArrows(e,t);if(!n)return;this.game.audio.quest();let r=this.progress.data.quiverLoad,i=r?.id===`iron_arrow`?r.n:0;this.game.hud.toast(i?`Made ${n} iron arrows · ${i} in the quiver`:`Made ${n} iron arrows`,1800),this.sparkForge(),this.render()}sparkForge(){let e=this.game.world.forge;e&&this.game.fx.burst(e.x+.4,e.y+1.1,e.z,[16747038,16765562,16777215],16,3.5,.09,.8,6,2)}fillGear(e,t,n){let r=this.progress;if(!n){Se(t.monster),e.innerHTML=`<h3>???</h3><p class="cat-muted">A weapon or armor piece forged from the parts of a monster you have not discovered yet.</p>`;return}let i=t.monster===`smith`,a=t.metal?`${t.metal} bars`:`bars`,o=i?{name:a}:Se(t.monster),s=t.set?cn(t.set):null,c=t.type===`weapon`?t.stats.map(([e,t])=>`<div><small>${e}</small><b>${t}</b></div>`).join(``):`<div><small>Slot</small><b>${le[t.slot]}</b></div><div><small>Defense</small><b>+${t.def}</b></div>${t.bonus?`<div><small>Bonus</small><b>${fb(t.bonus)}</b></div>`:``}`,l=t.type===`weapon`?y[t.wtype]:`${s?ve[s.tier]+` `:``}${le[t.slot]}`,u=[t.reqLevel?`<span>Strength ${t.reqLevel}</span>`:``,t.reqSmith?`<span>Smithing ${t.reqSmith}</span>`:``].join(``);e.innerHTML=`<h3>${lb(t.name)}</h3>
      <div class="cat-tags"><span>${l}</span><span>From ${lb(o.name)}</span>${u}</div>
      <p>${lb(t.desc)}</p>
      <div class="cat-stats">${c}</div>`,t.found?e.appendChild($(`p`,`cat-muted`,t.monster===`orcscout`?`Orc Scouts drop this. It is not forged at the smithy.`:`${o.name}s drop this whole, and only rarely (1 to 2%). It cannot be forged.`)):(e.appendChild($(`h4`,null,`Parts needed`)),e.appendChild(this.recipeChips(t)));let d=$(`div`,`cat-actions`);if(r.crafted(t.id)){let e=r.worn(t.id),n=!e&&t.reqLevel&&!r.meetsReq(t),i=$(`button`,`cat-btn go`,e?`Unequip`:n?`Need Strength ${t.reqLevel}`:t.type===`weapon`?`Equip`:`Wear`);i.type=`button`,i.disabled=!!n,i.onclick=()=>{this.game.wearPiece(t.id),this.render()},d.appendChild(i)}else{if(t.found){e.appendChild(d);return}let n=r.craftLock(t),i=this.forge&&!n,a=this.forge?n.startsWith(`smith:`)?`Need Smithing ${n.slice(6)}`:n===`parts`?`Missing parts`:n===`full`?`Inventory full`:`Forge it`:`Forge at the smithy`,o=$(`button`,`cat-btn`+(i?` go`:``),a);o.type=`button`,o.disabled=!i,o.onclick=()=>{let e=r.level(`smithing`);if(!this.forge||!r.craft(t.id))return;this.game.applyGear(),t.type===`weapon`&&this.game.selectSlot(0,!0),this.game.audio.quest(),this.game.hud.toast(`Forged ${t.name}`,1800);let n=r.level(`smithing`);n>e&&this.game.gather?.levelUp(`smithing`,n);let i=this.game.world.forge;i&&(this.game.fx.burst(i.x+.4,i.y+1.1,i.z,[16747038,16765562,16777215],22,4.5,.09,.9,6,2),this.game.fx.ring(i.x+.6,i.y+.6,i.z,16757575,14,2.5,.09,.5)),this.render()},d.appendChild(o),this.forge||d.appendChild($(`p`,`cat-muted`,`Weapons and armor are forged at the forge beside Greyrock Pit, just outside Oakhollow.`))}e.appendChild(d),t.type===`armor`&&s&&e.appendChild($(`p`,`cat-muted`,g.includes(t.slot)?`${lb(s.name)}. ${lb(s.bonus)}`:`${lb(s.name)} extra. Worn alongside any set${t.slot===`book`?`; it also lets Spell Book mastery apply to staffs and wands`:t.slot===`quiver`?`. It fills from the arrows in your bag, 99 at a time`:``}.`))}fillSet(e,t,n){let r=this.progress,i=t.monster===`smith`?{name:`the smithy`}:Se(t.monster);if(!n){e.innerHTML=`<h3>???</h3><p class="cat-muted">Discover the ${lb(i.name)} to reveal this armor set.</p>`;return}let a=r.setComplete(t.id);e.innerHTML=`<h3>${lb(t.name)}</h3>
      <div class="cat-tags"><span>${ve[t.tier]} set</span><span>${t.role}</span><span>From ${lb(i.name)}</span><span>${r.defense} defense worn</span></div>
      <p>${lb(db[t.id])}</p>
      <p class="${a?`cat-ok`:`cat-muted`}">${lb(t.bonus)}${a?` (active)`:``}</p>`;let o=$(`div`,`cat-made`);for(let e of D(t.id)){let t=$(`button`,`cat-mini`+(r.crafted(e.id)?` done`:``));t.type=`button`,t.appendChild(ib().thumb({kind:`armor`,id:e.id},!1,96)),t.appendChild($(`span`,null,`${lb(le[e.slot])}${r.worn(e.id)?` (worn)`:r.crafted(e.id)?``:` - not crafted`}`)),t.onclick=()=>this.goto({type:`gear`,id:e.id}),o.appendChild(t)}e.appendChild(o)}startViewer(e,t,n){let r=ib(),i=eb(t,n),a={subject:i,yaw:i.yaw,drag:!1,lastX:0,raf:0};this.viewer=a;let o=e.getContext(`2d`);e.addEventListener(`pointerdown`,t=>{a.drag=!0,a.lastX=t.clientX,e.setPointerCapture(t.pointerId)}),e.addEventListener(`pointermove`,e=>{a.drag&&(a.yaw+=(e.clientX-a.lastX)*.012,a.lastX=e.clientX)});let s=()=>a.drag=!1;e.addEventListener(`pointerup`,s),e.addEventListener(`pointercancel`,s);let c=performance.now(),l=t=>{if(this.viewer!==a)return;let n=Math.min(.05,(t-c)/1e3);c=t;let s=e.getBoundingClientRect(),u=Math.min(window.devicePixelRatio||1,2),d=Math.max(64,Math.round(s.width*u)),f=Math.max(64,Math.round(s.height*u));(e.width!==d||e.height!==f)&&(e.width=d,e.height=f),a.drag||(a.yaw+=n*.7),r.pending()||r.draw(i,a.yaw,o,d,f),a.raf=requestAnimationFrame(l)};a.raf=requestAnimationFrame(l)}},mb=`mg-weapon-cursor`,hb=[`sword`,`axe`,`hammer`,`spear`,`bow`,`crossbow`,`staff`,`wand`,`tome`,`dagger`,`dual`,`scythe`,`pick`,`default`],gb={onesword:`sword`,twosword:`sword`,dual:`dual`,hammer:`hammer`,spear:`spear`,staff:`staff`,wand:`wand`,shortbow:`bow`,longbow:`bow`,crossbow:`crossbow`,scythe:`scythe`},_b={blade:`sword`,orcblade:`sword`,ironsword:`sword`,axe:`axe`,hammer:`hammer`,bow:`bow`,dual:`dual`,crossbow:`crossbow`,wand:`wand`,tome:`tome`,pick:`pick`,staff:`staff`,spear:`spear`},vb={x:2,y:2};function yb(e){let t=String(e||``);return ne(t)||pe.find(e=>e.type===`weapon`&&(e.held===t||e.item?.held===t))||null}function bb(e){if(!e)return null;let t=String(e),n=yb(t);return n?.type===`weapon`?{kind:`weapon`,id:n.id}:{kind:`held`,id:t}}var xb=new Map;function Sb(e,t=64){let n=bb(e);if(!n)return null;let r=n.kind+`:`+n.id+`:`+t;if(xb.has(r))return xb.get(r);try{let e=ob(n,t).toDataURL(`image/png`);return xb.set(r,e),e}catch{return null}}function Cb(e){if(!e)return`default`;let t=String(e),n=yb(t);return n?.wtype&&gb[n.wtype]?gb[n.wtype]:_b[t]?_b[t]:/scythe/.test(t)?`scythe`:/crossbow/.test(t)?`crossbow`:/bow/.test(t)?`bow`:/staff/.test(t)?`staff`:/wand/.test(t)?`wand`:/tome|book/.test(t)?`tome`:/spear|lance/.test(t)?`spear`:/hammer|maul/.test(t)?`hammer`:/axe/.test(t)?`axe`:/pick/.test(t)?`pick`:/dual|twin|dagger|knife/.test(t)?/dual|twin/.test(t)?`dual`:`dagger`:/sword|blade|saber|brand/.test(t)?`sword`:`default`}function wb(e){let t=yb(e),n=String(e||``);return t?.monster===`darksycledragon`||n.startsWith(`dark`)||n===`darkhammer`?`dusk`:`base`}function Tb(e,t,n=1){let r=hb.includes(e)?e:`default`,i=t===`dusk`?`dusk`:`base`,a=n>=1.5?64:32,o=typeof document<`u`?document.baseURI:`/`;return new URL(`cursors/${r}-${i}-${a}.svg`,o).href}function Eb(e,t,n=1){let r=n>=1.5?vb.x*2:vb.x,i=n>=1.5?vb.y*2:vb.y;return`url("${Tb(e,t,n)}") ${r} ${i}, auto`}function Db(){try{let e=localStorage.getItem(mb);return e==null||e===``||e!==`0`&&e!==`false`}catch{return!0}}function Ob(e){try{localStorage.setItem(mb,e?`1`:`0`)}catch{}}function kb(){try{return typeof matchMedia==`function`&&matchMedia(`(pointer: fine)`).matches}catch{return!1}}function Ab(e){if(e?.mmo){let t=e.worldView?.localHeld;return t!=null&&t!==``?t:e?.player?.heldKind||e?.player?.sheathKind||null}return e?.progress?.weaponItem?.held||e?.player?.sheathKind||null}function jb(e){let t=e?.canvas||e?.renderer?.domElement||document.getElementById(`game`);if(!t||typeof document>`u`)return;let n=Db()&&kb();if(document.body.classList.toggle(`weapon-cursor-on`,n),!n){t.style.cursor=``;return}let r=Ab(e),i=Cb(r),a=wb(r),o=typeof window<`u`&&window.devicePixelRatio||1,s=Sb(r,64);t.style.cursor=s?`url("`+s+`") 4 4, `+Eb(i,a,o):Eb(i,a,o)}var Mb=`mg-world-mode`,Nb=`mg-world-join`,Pb=`mg-world-auth`,Fb=`Play Online — World 1`,Ib=`World 1 coming soon`,Lb=`On World 1`,Rb=`World 1 — Online`,zb=`Solo — Offline`,Bb=`Joining World 1…`,Vb=`Choose a world`,Hb=`Waking…`,Ub=2500,Wb=[`mock`,`mockwake`,`mockerr`,`mocksocial`,`mockwallet`,`debug`,`unlock`,`tp`,`spawn`,`tank`,`autoatk`,`picker`,`worldpick`];function Gb(e=``){return new URLSearchParams(String(e||``).replace(/^\?/,``))}function Kb(e=``){return Gb(e).get(`mmo`)===`1`}function qb(e){let t=e??{BASE_URL:`/`,DEV:!1,MODE:`production`,PROD:!0,SSR:!1,VITE_BUILD_ID:`2d08d77`,VITE_MMO_URL:`wss://monster-gate-world-1.onrender.com`,VITE_SUPABASE_ANON_KEY:`sb_publishable_cCwUxL9soP8Vu3mp28G2jQ_EW1UkNLS`,VITE_SUPABASE_URL:`https://xkytkzspqyqjpjsuscbb.supabase.co`,VITE_WORLD_URL:`wss://monster-gate-world-1.onrender.com`},n=typeof t?.VITE_MMO_URL==`string`?t.VITE_MMO_URL.trim():``,r=typeof t?.VITE_WORLD_URL==`string`?t.VITE_WORLD_URL.trim():``;return n||r}function Jb(e=``,t){return String(Gb(e).get(`server`)||``).trim()?!0:qb(t)!==``}function Yb(e=``,t){return String(Gb(e).get(`server`)||``).trim()||qb(t)}function Xb(e){let t=String(e||``).trim();if(!t)return``;try{let e=t.replace(/^wss:/i,`https:`).replace(/^ws:/i,`http:`),n=new URL(e);return n.pathname=`/healthz`,n.search=``,n.hash=``,n.href}catch{return``}}function Zb(e){if(!e)return``;try{let t=new URL(e);return t.pathname=`/health`,t.search=``,t.hash=``,t.href}catch{return``}}function Qb({ok:e=!1,json:t={},elapsedMs:n=0,slowMs:r=Ub}={}){let i=Number(t?.players),a=Number.isFinite(i)?i:null;return!e||n>r?{live:!1,label:Hb,players:a}:{live:!0,label:`Online · ${a??0}`,players:a??0}}async function $b(e,{fetchFn:t,timeoutMs:n=Ub,now:r}={}){let i=r||Date.now,a=i();if(!e)return{live:!1,label:Hb,players:null};let o=t||(typeof fetch<`u`?fetch.bind(globalThis):null);if(!o)return{live:!1,label:Hb,players:null};let s=async e=>{let t=typeof AbortController<`u`?new AbortController:null,r=setTimeout(()=>t?.abort(),n);try{let n=await o(e,{signal:t?.signal,cache:`no-store`}),r={};try{r=typeof n.json==`function`?await n.json():{}}catch{r={}}return{ok:!!n.ok,json:r,elapsedMs:i()-a}}catch{return{ok:!1,json:{},elapsedMs:i()-a}}finally{clearTimeout(r)}},c=await s(e);if(!c.ok&&c.elapsedMs<n){let t=Zb(e);t&&t!==e&&(c=await s(t))}return Qb({...c,slowMs:n})}function ex(e=``,{mmo:t=!1,join:n=!1,drop:r=Wb}={}){let i=Gb(e);for(let e of r)i.delete(e);n||i.delete(`join`),t?i.set(`mmo`,`1`):i.delete(`mmo`),n&&t&&i.set(`join`,`1`);let a=i.toString();return a?`?${a}`:``}function tx(e=``,{join:t=!1}={}){return ex(e,{mmo:!0,join:t})}function nx(e=``){return ex(e,{mmo:!1,join:!1})}function rx(e=``,t={}){let n=t.pathname||`/`,r=t.hash||``;return`${n}${e||``}${r}`}function ix({search:e,loc:t}={}){return e??t?.search??Mx().search??``}function ax({search:e,env:t,online:n,loc:r}={}){let i=ix({search:e,loc:r}),a=Jb(i,t),o=n??Kb(i);return a?o?{ready:!0,disabled:!1,label:Lb,action:`online`}:{ready:!0,disabled:!1,label:Fb,action:`online`}:{ready:!1,disabled:!0,label:Ib,action:`none`}}function ox(e,t={}){if(!e)return null;let n=ax(t),r=ix(t),i=t.short&&n.action===`online`&&!Kb(r);return t.syncLabel!==!1&&(e.textContent=i?`World 1`:n.label),e.disabled=n.disabled,e.setAttribute(`aria-disabled`,n.disabled?`true`:`false`),e.dataset.worldReady=n.ready?`1`:`0`,e.title=n.ready?``:`A world server is not configured for this build.`,n}function sx(e,{search:t,loc:n}={}){if(!e||e.dataset?.connectionState)return;let r=Kb(t??n?.search??Mx().search);e.hidden=!1,e.dataset.mode=r?`online`:`offline`,e.textContent=r?`Online`:`Offline`}function cx(e){let t=Nx(e)?.getItem?.(Mb);return t===`online`||t===`offline`?t:null}function lx(e,t){let n=Nx(t);if(!(!n||e!==`online`&&e!==`offline`))try{n.setItem(Mb,e)}catch{}}function ux(e=`online`,t){let n=Px(t);if(n)try{n.setItem(Nb,e===`offline`?`offline`:`online`)}catch{}}function dx({search:e,storage:t,loc:n}={}){let r=Mx(n),i=e??r.search??``,a=Gb(i).get(`join`)===`1`,o=Px(t),s=``;try{s=o?.getItem?.(`mg-world-join`)||``,s&&o.removeItem(Nb)}catch{s=``}return a&&jx(r,i),s===`offline`?`offline`:s===`online`||s===`1`||a?`online`:null}function fx({signedIn:e=!1,join:t=null,hasCharacter:n=!1}={}){return t?t===`offline`?e?n?`enter`:`select`:`none`:e?n?`enter`:`select`:`signin`:`none`}function px(e){let t=Px(e);if(t)try{t.setItem(Pb,`1`)}catch{}}function mx(e){let t=Px(e);if(!t)return!1;try{let e=t.getItem(Pb)===`1`;return e&&t.removeItem(Pb),e}catch{return!1}}function hx(e){for(let t of Fx(e))if(t?.getItem)try{let e=JSON.parse(t.getItem(`monster-gate-account-session`)||`null`);if(e&&typeof e.accessToken==`string`&&e.accessToken.trim())return e.accessToken.trim()}catch{}return``}function gx(e){return hx(e)!==``}function _x({search:e=``,stores:t,token:n}={}){return!Kb(e)||Gb(e).get(`mock`)===`1`?!1:n==null?gx(t):!!n&&n!==``}function vx({search:e=``,stores:t,token:n}={}){if(!Kb(e))return!1;let r=Gb(e).get(`mock`)===`1`,i=Gb(e).get(`mockwake`);return r||i&&i!==`0`&&i!==`false`?!1:!(n==null?gx(t):n&&n!==``)}function yx(e={}){let t=Mx(e.loc),n=e.search??t.search??``;if(!Kb(n))return!1;lx(`offline`,e.storage),px(e.session||e.storage);let r=rx(nx(n),t);if(typeof t.replaceState==`function`)t.replaceState({},``,r);else if(typeof history<`u`&&history.replaceState)try{history.replaceState({},``,r)}catch{t.replace?.(r)}else t.replace?.(r);return!0}function bx(e={}){let t=Mx(e.loc),n=e.search??t.search??``;if(!Jb(n,e.env))return!1;lx(`online`,e.storage),ux(`online`,e.session||e.storage);let r=rx(tx(n,{join:!0}),t);return r===`${t.pathname||`/`}${t.search||``}${t.hash||``}`?(typeof t.reload==`function`?t.reload():t.assign(r),!0):(t.assign(r),!0)}function xx(e){return!!(e&&e.closed===!0)}function Sx({search:e=``,signedIn:t=!1,authReject:n=!1,mmo:r=null}={}){return t?!!(n||Kb(e)&&xx(r)):!1}function Cx(e,t){if(!e)return t&&(t.mmo=null),null;let n=e.dispose||e.close||e.disconnect||e.stop;if(typeof n==`function`)try{n.call(e)}catch{}return t&&t.mmo===e&&(t.mmo=null),typeof window<`u`&&window.__mmo===e&&(window.__mmo=null),null}function wx({game:e,view:t,mmo:n,attach:r,search:i}={}){return Cx(n||e?.mmo||(typeof window<`u`?window.__mmo:null),e),t?.clearAuthLatch?.(),typeof r==`function`&&(r(e,t,i==null?{}:{search:i})||e?.mmo)||null}function Tx(e={}){let t=Mx(e.loc),n=e.search??t.search??``;return lx(`offline`,e.storage),e.continue!==!1&&ux(`offline`,e.session||e.storage),Kb(n)?(t.replace(rx(nx(n),t)),!0):!1}function Ex(e={}){return!gx(e.stores)&&!e.force?(lx(`online`,e.storage),ux(`online`,e.session||e.storage),e.onNeedSignIn?.(),!1):bx(e)}function Dx({join:e=null,search:t=``,hasToken:n=!1}={}){return e===`online`&&n&&!Kb(t)?`enter-online`:`select`}function Ox({search:e,win:t}={}){let n=t||(typeof window<`u`?window:null);if(n?.__mgForceWorldPick)return!0;let r=Gb(e??(typeof n?.location?.search==`string`?n.location.search:``));return r.get(`picker`)===`1`||r.get(`worldpick`)===`1`}function kx({search:e=``,env:t,last:n=null,health:r=null,joining:i=!1,signedIn:a=!1,force:o=!1}={}){let s=Jb(e,t),c=n===`online`||n===`offline`?n:`online`,l=s?r?.label||`Checking…`:``;return{show:o||a,title:Vb,selected:c,online:{label:s?i?Bb:Rb:Ib,status:l,disabled:!s||i,selected:c===`online`,action:s&&!i?`online`:`none`},solo:{label:zb,disabled:i,selected:c===`offline`,action:i?`none`:`offline`}}}function Ax(e,t){if(!e||!t)return t;e.hidden=!t.show,e.classList.toggle(`hidden`,!t.show);let n=e.querySelector(`.world-picker-title`);n&&(n.textContent=t.title);let r=e.querySelector(`#pick-world1`),i=e.querySelector(`#pick-world1-status`),a=e.querySelector(`#pick-solo`);if(r){let e=r.querySelector(`b`);e?e.textContent=t.online.label:r.textContent=t.online.label,r.disabled=t.online.disabled,r.classList.toggle(`sel`,t.online.selected),r.setAttribute(`aria-pressed`,t.online.selected?`true`:`false`)}if(i&&(i.textContent=t.online.status),a){let e=a.querySelector(`b`);e?e.textContent=t.solo.label:a.textContent=t.solo.label,a.disabled=t.solo.disabled,a.classList.toggle(`sel`,t.solo.selected),a.setAttribute(`aria-pressed`,t.solo.selected?`true`:`false`)}return t}function jx(e,t){let n=rx(ex(t,{mmo:Kb(t),join:!1}),e);if(typeof e.replaceState==`function`)e.replaceState({},``,n);else if(typeof history<`u`&&history.replaceState)try{history.replaceState({},``,n)}catch{}}function Mx(e){return e||(typeof window<`u`&&window.location?window.location:{search:``,pathname:`/`,hash:``,assign(){},replace(){},replaceState(){},reload(){}})}function Nx(e){if(e)return e;try{if(typeof localStorage<`u`)return localStorage}catch{return null}return null}function Px(e){if(e)return e;try{if(typeof sessionStorage<`u`)return sessionStorage}catch{return null}return Nx()}function Fx(e){if(Array.isArray(e))return e;if(e&&typeof e.getItem==`function`)return[e];let t=[];try{typeof sessionStorage<`u`&&t.push(sessionStorage)}catch{}try{typeof localStorage<`u`&&t.push(localStorage)}catch{}return t}export{jc as $,Do as $t,Yb as A,ka as An,To as At,Nv as B,ho as Bt,Ox as C,Ha as Cn,qo as Ct,fx as D,no as Dn,Io as Dt,Dx as E,co as En,Ho as Et,sb as F,G as Fn,Fo as Ft,Av as G,ls as Gt,lv as H,us as Ht,ab as I,ba as In,Wo as It,M_ as J,cs as Jt,Rv as K,ts as Kt,dy as L,Oo as Lt,Ob as M,Fa as Mn,Jo as Mt,Db as N,Na as Nn,go as Nt,kx as O,Da as On,yo as Ot,pb as P,Oa as Pn,_o as Pt,F_ as Q,Ao as Qt,kv as R,Eo as Rt,vx as S,Ra as Sn,bo as St,_x as T,Xa as Tn,jo as Tt,cv as U,rs as Ut,uv as V,as as Vt,Dv as W,os as Wt,A_ as X,ss as Xt,N_ as Y,ns as Yt,P_ as Z,mo as Zt,sx as _,Ba as _n,qs as _t,bx as a,wo as an,ic as at,lx as b,Wa as bn,No as bt,Xb as c,Mo as cn,yc as ct,cx as d,Vo as dn,ys as dt,Co as en,Ac as et,Tx as f,Xo as fn,gs as ft,tx as g,Ua as gn,Fs as gt,Ex as h,Ka as hn,hs as ht,yx as i,Ro as in,dc as it,jb as j,Ia as jn,Zo as jt,Jb as k,Ea as kn,vo as kt,rx as l,Yo as ln,ac as lt,nx as m,La as mn,vs as mt,dx as n,Lo as nn,rc as nt,$b as o,Go as on,vc as ot,ux as p,q as pn,_s as pt,O_ as q,is as qt,Cx as r,Ko as rn,oc as rt,gx as s,ko as sn,gc as st,mx as t,Bo as tn,_c as tt,Kb as u,zo as un,Is as ut,Ax as v,za as vn,K as vt,Sx as w,Va as wn,Po as wt,wx as x,eo as xn,So as xt,ox as y,Ga as yn,ds as yt,Uv as z,xo as zt};