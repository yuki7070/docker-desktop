CCFLAGS=-O3 -s WASM=1 -s BUILD_AS_WORKER=1 -s EXPORTED_RUNTIME_METHODS="['setValue', 'getValue']" \
		 -s NO_FILESYSTEM=1 --llvm-lto 1 --memory-init-file 0 -s ASSERTIONS=1

OPUS_DECODER_EXPORTS:='_opus_decoder_create','_opus_decode_float','_opus_decoder_ctl','_opus_decoder_destroy'
SPEEXDSP_EXPORTS:='_speex_resampler_init','_speex_resampler_destroy','_speex_resampler_process_interleaved_float'

default: browserify

browserify: build/libopus.js
	browserify src/AudioPlayer -o build/AudioPlayer.js
	browserify src/OpusDecoder.js build/libopus.js -o build/OpusDecoder.js
	browserify src/VideoPlayer lib/Broadway/Player/Player.js -o build/VideoPlayer.js
	cp lib/Broadway/Player/avc.wasm build/avc.wasm
	cp lib/Broadway/Player/Decoder.js build/Decoder.js

build/libopus.js: libopus
	mkdir -p lib/build
	emcc $(CCFLAGS) ./lib/build/lib/libopus.a -s EXPORTED_FUNCTIONS="['_malloc',$(OPUS_DECODER_EXPORTS)]" -o build/libopus.js
	echo "module.exports = Module" >> build/libopus.js

libopus/config.h: 
	cd lib/libopus; ./autogen.sh
	cd lib/libopus; emconfigure ./configure --prefix="$$PWD/../build" --enable-fixed-point


libopus: libopus/config.h
	emmake $(MAKE) -C lib/libopus
	emmake $(MAKE) -C lib/libopus install

clean:
	rm -rf lib/build/*
