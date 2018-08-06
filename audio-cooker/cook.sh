#!/bin/sh
# Copyright (c) 2017, 2018 Yahweasel
#
# Permission to use, copy, modify, and/or distribute this software for any
# purpose with or without fee is hereby granted, provided that the above
# copyright notice and this permission notice appear in all copies.
#
# THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
# WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
# MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
# SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
# WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
# OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
# CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

timeout() {
    /usr/bin/timeout -k 5 "$@"
}

DEF_TIMEOUT=7200
ulimit -v $(( 2 * 1024 * 1024 ))
echo 10 > /proc/self/oom_adj

PATH="/opt/node/bin:$PATH"
export PATH

#cd ../
SCRIPTBASE=$(pwd) # Note: Work at the root directory of MFB-Archiver, when swaning cooking script
#SCRIPTBASE=`dirname "$0"`
#SCRIPTBASE=`realpath "$SCRIPTBASE"`

# Recording ID
[ "$1" ] 

# Format
FORMAT=flac
[ "$2" ] && FORMAT="$2"

# Container type
CONTAINER=zip
[ "$3" ] && CONTAINER="$3"

ARESAMPLE="aresample=flags=res:min_comp=0.001:max_soft_comp=0.025:min_hard_comp=15:first_pts=0"

ZIPFLAGS=-1
EXTRAFILES=

case "$FORMAT" in
    copy)
        ext=ogg
        ;;
    oggflac)
        ext=oga
        ENCODE="flac --ogg --serial-number=1 - -c"
        ;;
    vorbis)
        ext=ogg
        ENCODE="oggenc -q 6 -"
        ;;
    aac)
        ext=aac
        #ENCODE="faac -q 100 -o /dev/stdout -"
        ENCODE="fdkaac -f 2 -m 4 -o - -"
        ;;
    heaac)
        ext=aac
        ENCODE="fdkaac -p 29 -f 2 -m 4 -o - -"
        ;;
    opus)
        ext=opus
        ENCODE="opusenc --bitrate 96 - -"
        ;;
    wav|adpcm)
        ext=wav
        ENCODE="ffmpeg -f wav -i - -c:a adpcm_ms -f wav -"
        CONTAINER=zip
        ZIPFLAGS=-9
        ;;
#    wav8)
#        ext=wav
#        ENCODE="ffmpeg -f wav -i - -c:a pcm_u8 -f wav -"
#        CONTAINER=zip
#        ZIPFLAGS=-9
#        ;;
#    wavsfx)
#        ext=flac
#        ENCODE="flac - -c"
#        EXTRAFILES="RunMe.bat ffmpeg.exe"
#        ;;
#    wavsfxm)
#        ext=flac
#        ENCODE="flac - -c"
#        EXTRAFILES="RunMe.command ffmpeg"
#        ;;
#    wavsfxu)
#        ext=flac
#        ENCODE="flac - -c"
#        EXTRAFILES="RunMe.sh"
#        ;;
    mp3)
        ext=mp3
        ENCODE="lame -b 128 - -"
        ;;
    ra)
        ext=ra
        ENCODE="ffmpeg -f wav -i - -f rm -"
        ;;
    *)
        ext=flac
        ENCODE="flac - -c"
        ;;
esac
if [ "$CONTAINER" = "mix" ]
then
    # Smart auto-mixing, so ext is temporary
    ext=ogg
fi

cd "$SCRIPTBASE/data/rec"

#mkdir "$1"
#tmpdir="$SCRIPTBASE/data/rec/$1"
tmpdir=`mktemp -d`
[ "$tmpdir" -a -d "$tmpdir" ]

# echo 'rm -rf '"$tmpdir" | at 'now + 2 hours'

mkdir "$tmpdir/in" "$tmpdir/out" || exit 1

# Take a lock on the data file so that we can detect active downloads
exec 9< "$1.ogg.data"
flock -s 9

NICE=""
NB_STREAMS=`timeout 10 cat $1.ogg.header1 $1.ogg.header2 $1.ogg.data |
    timeout 10 ffprobe -print_format flat -show_format - 2> /dev/null |
    grep '^format\.nb_streams' |
    sed 's/^[^=]*=//'`

# Prepare the self-extractor
#if [ "$FORMAT" = "wavsfx" ]
#then
#    sed 's/^/@REM   / ; s/$/\r/g' "$SCRIPTBASE/audio-cooker/ffmpeg-lgpl21.txt" > "$tmpdir/out/RunMe.bat"
#    mkfifo "$tmpdir/out/ffmpeg.exe"
#    timeout $DEF_TIMEOUT cat "$SCRIPTBASE/audio-cooker/ffmpeg-wav.exe" > "$tmpdir/out/ffmpeg.exe" &
#
#elif [ "$FORMAT" = "wavsfxm" -o "$FORMAT" = "wavsfxu" ]
#then
#    RUNMESUFFIX=sh
#    if [ "$FORMAT" = "wavsfxm" ]
#    then
#        cp "$SCRIPTBASE/audio-cooker/ffmpeg-wav.macosx" "$tmpdir/out/ffmpeg"
#        chmod a+x "$tmpdir/out/ffmpeg"
#        RUNMESUFFIX=command
#    fi
#
#    (
#        printf '#!/bin/sh\n'
#        sed 's/^/#   /' "$SCRIPTBASE/audio-cooker/ffmpeg-lgpl21.txt"
#        printf 'set -e\ncd "$(dirname "$0")"\n\n'
#    ) > "$tmpdir/out/RunMe.$RUNMESUFFIX"
#    chmod a+x "$tmpdir/out/RunMe.$RUNMESUFFIX"
#
#fi

# Encode thru fifos
for c in `seq -w 1 $NB_STREAMS`
do
    O_USER="`$SCRIPTBASE/audio-cooker/userinfo.js $1 $c`"
    [ "$O_USER" ] || unset O_USER
    O_FN="$c${O_USER+-}$O_USER.$ext"
    O_FFN="$tmpdir/out/$O_FN"
    T_DURATION=`timeout $DEF_TIMEOUT $NICE "$SCRIPTBASE/audio-cooker/oggduration" $c < $1.ogg.data`
    mkfifo "$O_FFN"
    if [ "$FORMAT" = "copy" -o "$CONTAINER" = "mix" ]
    then
        timeout $DEF_TIMEOUT cat $1.ogg.header1 $1.ogg.header2 $1.ogg.data |
            timeout $DEF_TIMEOUT $NICE "$SCRIPTBASE/audio-cooker/oggstender" $c > "$O_FFN" &

    else
        timeout $DEF_TIMEOUT cat $1.ogg.header1 $1.ogg.header2 $1.ogg.data |
            timeout $DEF_TIMEOUT $NICE "$SCRIPTBASE/audio-cooker/oggstender" $c |
            timeout $DEF_TIMEOUT $NICE ffmpeg -codec libopus -copyts -i - \
            -af "$ARESAMPLE" \
            -flags bitexact -f wav - |
            timeout $DEF_TIMEOUT $NICE "$SCRIPTBASE/audio-cooker/wavduration" "$T_DURATION" |
            (
                timeout $DEF_TIMEOUT $NICE $ENCODE > "$O_FFN";
                cat > /dev/null
            )&
            # timeout $DEF_TIMEOUT $NICE $ENCODE > "$O_FFN" &

    fi

#    if [ "$FORMAT" = "wavsfx" ]
#    then
#        printf 'ffmpeg -i %s %s\r\ndel %s\r\n\r\n' "$O_FN" "${O_FN%.flac}.wav" "$O_FN" >> "$tmpdir/out/RunMe.bat"
#    elif [ "$FORMAT" = "wavsfxm" -o "$FORMAT" = "wavsfxu" ]
#    then
#        (
#            [ "$FORMAT" != "wavsfxm" ] || printf './'
#            printf 'ffmpeg -i %s %s\nrm %s\n\n' "$O_FN" "${O_FN%.flac}.wav" "$O_FN"
#        ) >> "$tmpdir/out/RunMe.$RUNMESUFFIX"
#    fi
done
#if [ "$FORMAT" = "wavsfxm" -o "$FORMAT" = "wavsfxu" ]
#then
#    printf "printf '\\\\n\\\\n===\\\\nProcessing complete.\\\\n===\\\\n\\\\n'\\n" >> "$tmpdir/out/RunMe.$RUNMESUFFIX"
#fi
if [ "$CONTAINER" = "zip" -o "$CONTAINER" = "exe" ]
then
    mkfifo $tmpdir/out/raw.dat
    timeout 10 "$SCRIPTBASE/audio-cooker/recinfo.js" "$1" |
        timeout $DEF_TIMEOUT cat - $1.ogg.header1 $1.ogg.header2 $1.ogg.data > $tmpdir/out/raw.dat &
fi

# Put them into their container
cd $tmpdir/out
case "$CONTAINER" in
    ogg|matroska)
        if [ "$FORMAT" = "copy" -a "$CONTAINER" = "ogg" ]
        then
            "$SCRIPTBASE/audio-cooker/oggmultiplexer" *.ogg
        else
            INPUT=""
            MAP=""
            c=0
            for i in *.$ext
            do
                [ "$FORMAT" != "copy" ] || INPUT="$INPUT -copyts"
                INPUT="$INPUT -i $i"
                MAP="$MAP -map $c"
                c=$((c+1))
            done
            timeout $DEF_TIMEOUT $NICE ffmpeg $INPUT $MAP -c:a copy -f $CONTAINER - < /dev/null
        fi
        ;;

    mix)
        INPUT=""
        FILTER=""
        MIXFILTER=""
        c=0
        for i in *.$ext
        do
            INPUT="$INPUT -codec libopus -copyts -i $i"
            FILTER="$FILTER[$c:a]$ARESAMPLE,dynaudnorm[aud$c];"
            MIXFILTER="$MIXFILTER[aud$c]"
            c=$((c+1))
        done
        MIXFILTER="$MIXFILTER amix=$c,dynaudnorm[aud]"
        FILTER="$FILTER$MIXFILTER"
        DURATION=`timeout $DEF_TIMEOUT $NICE "$SCRIPTBASE/audio-cooker/oggduration" < $1.ogg.data`
        timeout $DEF_TIMEOUT $NICE ffmpeg $INPUT -filter_complex "$FILTER" -map '[aud]' -flags bitexact -f wav - < /dev/null |
            timeout $DEF_TIMEOUT $NICE "$SCRIPTBASE/audio-cooker/wavduration" "$DURATION" |
            (
                timeout $DEF_TIMEOUT $NICE $ENCODE;
                cat > /dev/null
            )
        ;;

#    exe)
#        timeout $DEF_TIMEOUT $NICE zip $ZIPFLAGS -FI - *.$ext $EXTRAFILES raw.dat |
#        cat "$SCRIPTBASE/audio-cooker/sfx.exe" -
#        ;;

    *)
        timeout $DEF_TIMEOUT $NICE zip $ZIPFLAGS -FI - *.$ext $EXTRAFILES raw.dat
        ;;
esac | (cat || cat > /dev/null)

# And clean up after ourselves
cd
rm -rf "$tmpdir/"

wait
