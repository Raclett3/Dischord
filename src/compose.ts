/**
 * These codes are licensed under CC0.
 * https://creativecommons.org/publicdomain/zero/1.0/deed
 */

import {ReadableStreamBuffer} from "stream-buffers";

type WaveType = "noise" | "triangle" | "saw" | "sine" | "square50" | "square25" | "square12.5";

type Wave = {
    type: WaveType,
    volume: number,
    detune: number,
    octave: number
}

type Scale = {
    [key: string]: number
}

const frequencyScale: Scale = {
    "c-":  493.883,
    "c" :  523.251,
    "c+":  554.365,
    "d-":  554.365,
    "d" :  587.330,
    "d+":  622.254,
    "e-":  622.254,
    "e" :  659.255,
    "e+":  698.456,
    "f-":  659.255,
    "f" :  698.456,
    "f+":  739.989,
    "g-":  739.989,
    "g" :  783.991,
    "g+":  830.609,
    "a-":  830.609,
    "a" :  880.000,
    "a+":  932.328,
    "b-":  932.328,
    "b" :  987.767,
    "b+": 1046.502
}

type LoopStack = {
    position: number,
    loopCount: number | null
}[];

export default function(score: string, voiceChannel: boolean): Buffer | ReadableStreamBuffer | null  {
    const tokens = score.toLowerCase().match(/([a-g][-+]?|r)[0-9]*\.?|[;<>()\[]|\][0-9]+|[tlyw][0-9]+|@[0-9]+(,-?[0-9]+)*/g);
    if (tokens === null) {
        return null;
    }
    let tempo = 120;
    let bufferIndex = 0;
    let bufferLength = 0;
    let toneLength = 8;
    let octave = 0;
    const sampling = voiceChannel ? 96000 : 44100; 
    let bufferSize = sampling * 10;
    let buffer: Buffer = Buffer.alloc(bufferSize * 2);
    let tone: Wave[] = [];
    let chord = false;
    let lastEnd = 0;
    let decay = 0;
    let sweep = 1;
    const loopStack: LoopStack = [];
    const tokenLength = tokens.length;
    for (let i = 0; i < tokenLength; i++) {
        const currentToken = tokens[i];
        if (currentToken[0] === "r") {
            let end = 0;
            if (currentToken.length === 1) {
                end = 240 / tempo / toneLength * sampling + bufferIndex;
            } else if (currentToken.slice(-1) === ".") {
                end = 240 / tempo / Number(currentToken.slice(1, -1)) * 1.5 * sampling + bufferIndex;
            } else {
                end = 240 / tempo / Number(currentToken.slice(1)) * sampling + bufferIndex;
            }
            end = Math.floor(end);
            if (end >= bufferSize) {
                buffer = Buffer.concat([buffer, Buffer.alloc(bufferSize * 2)]);
                bufferSize *= 2;
            }
            bufferIndex = end - 1;
            if (bufferIndex >= bufferLength) {
                bufferLength = bufferIndex + 1;
            }
            if (bufferLength > (voiceChannel ? 5000000 : 2000000)) {
                return null;
            }
        } else if (currentToken[0] >= "a" && currentToken[0] <= "g") {
            let scale = currentToken[0];
            let end = 0;
            if (currentToken[1] === "+" || currentToken[1] === "-") {
                scale += currentToken[1];
                if (currentToken.slice(-1) === ".") {
                    if (currentToken.length === 3) {
                        end = 240 / tempo / toneLength * sampling * 1.5 + bufferIndex;
                    } else {
                        end = 240 / tempo / Number(currentToken.slice(2, -1)) * 1.5 * sampling + bufferIndex;
                    }
                } else {
                    if (currentToken.length === 2) {
                        end = 240 / tempo / toneLength * sampling + bufferIndex;
                    } else {
                        end = 240 / tempo / Number(currentToken.slice(2)) * sampling + bufferIndex;
                    }
                }
            } else {
                if (currentToken.slice(-1) === ".") {
                    if (currentToken.length === 2) {
                        end = 240 / tempo / toneLength * sampling * 1.5 + bufferIndex;
                    } else {
                        end = 240 / tempo / Number(currentToken.slice(1, -1)) * 1.5 * sampling + bufferIndex;
                    }
                } else {
                    if (currentToken.length === 1) {
                        end = 240 / tempo / toneLength * sampling + bufferIndex;
                    } else {
                        end = 240 / tempo / Number(currentToken.slice(1)) * sampling + bufferIndex;
                    }
                }
            }
            end = Math.floor(end);
            lastEnd = end;
            if (end >= bufferSize) {
                buffer = Buffer.concat([buffer, Buffer.alloc(bufferSize * 2)]);
                bufferSize *= 2;
            }
            const frequency = frequencyScale[scale] * Math.pow(2, octave);
            const start = bufferIndex;
            let currentVolume = 1;
            let currentFreq = frequency;
            while (bufferIndex < end) {
                let amplitude = 0;
                if (end - sampling / 100 > bufferIndex) {
                    if (tone.length !== 0) {
                        for (const wave of tone) {
                            switch (wave.type) {
                                case "noise":
                                    amplitude += (Math.random() - 0.5) * wave.volume * currentVolume;
                                    break;
                                case "saw":
                                    amplitude += (((bufferIndex - start) / sampling * currentFreq * Math.pow(2, wave.octave) * wave.detune) % 2 - 1) / 2 * wave.volume * currentVolume;
                                    break;
                                case "sine":
                                    amplitude += (Math.sin((bufferIndex - start) / sampling * currentFreq * Math.pow(2, wave.octave) * wave.detune * Math.PI) - 0.5) * wave.volume * currentVolume;
                                    break;
                                case "triangle":
                                    amplitude += (Math.acos(Math.cos((bufferIndex - start) / sampling * currentFreq * Math.pow(2, wave.octave) * wave.detune * Math.PI)) / Math.PI - 0.5) * wave.volume * currentVolume;
                                    break;
                                case "square12.5":
                                    amplitude += (Math.floor((bufferIndex - start) / sampling * currentFreq * Math.pow(2, wave.octave) * wave.detune * 4) % 8 === 7 ? 0.5 : -0.5) * wave.volume * currentVolume;
                                    break;
                                case "square25":
                                    amplitude += (Math.floor((bufferIndex - start) / sampling * currentFreq * Math.pow(2, wave.octave) * wave.detune * 2) % 4 === 3 ? 0.5 : -0.5) * wave.volume * currentVolume;
                                    break;
                                case "square50":
                                    amplitude += (Math.floor((bufferIndex - start) / sampling * currentFreq * Math.pow(2, wave.octave) * wave.detune) % 2 ? 0.5 : -0.5) * wave.volume * currentVolume;
                                    break;
                            }
                        }
                    } else {
                        amplitude += (Math.floor((bufferIndex - start) / sampling * currentFreq) % 2 ? 0.5 : -0.5) * currentVolume;
                    }
                }
                let value = Math.floor((amplitude / 8)  * 0x8000);
                if (bufferLength > bufferIndex) {
                    value += buffer.readInt16LE(bufferIndex * 2);
                }
                if (value <= -0x8000) {
                    value = -0x7999;
                }
                if (value >= 0x8000) {
                    value = 0x7999;
                }
                if (bufferLength <= bufferIndex) {
                    bufferLength = bufferIndex + 1;
                    if (bufferLength > (voiceChannel ? 5000000 : 2000000)) {
                        return null;
                    }
                }
                buffer.writeInt16LE(value, bufferIndex * 2);
                bufferIndex++;
                currentVolume -= decay / sampling;
                if (currentVolume < 0) {
                    currentVolume = 0;
                }
                currentFreq *= Math.pow(sweep, 1 / sampling);
            }
            if (chord) {
                bufferIndex = start;
            }
        } else if (currentToken[0] === "<") {
            octave++;
        } else if (currentToken[0] === ">") {
            octave--;
        } else if (currentToken[0] === "(") {
            chord = true;
        } else if (currentToken[0] === ")") {
            chord = false;
            bufferIndex = lastEnd;
        } else if (currentToken[0] === "[") {
            loopStack.push({
                position: i,
                loopCount: null
            });
        } else if (currentToken[0] === "]" && loopStack.length > 0) {
            const stackTop = loopStack.length - 1;
            if (loopStack[stackTop].loopCount === null) {
                loopStack[stackTop].loopCount = Number(currentToken.slice(1)) - 1;
                i = loopStack[stackTop].position;
            } else {
                loopStack[stackTop].loopCount!--;
                if (loopStack[stackTop].loopCount! > 0) {
                    i = loopStack[stackTop].position;
                }
            }
            if (loopStack[stackTop].loopCount! <= 0) {
                loopStack.pop();
            }
        } else if (currentToken[0] === ";") {
            tone = [];
            bufferIndex = 0;
            octave = 0;
            decay = 0;
            sweep = 1;
        } else if (currentToken[0] === "t") {
            tempo = Number(currentToken.slice(1));
        } else if (currentToken[0] === "l") {
            toneLength = Number(currentToken.slice(1));
        } else if (currentToken[0] === "y") {
            decay = (10000 - Math.pow(Number(currentToken.slice(1)), 2)) / 1000;
        } else if (currentToken[0] === "w") {
            sweep = Number(currentToken.slice(1)) / 100;
        } else if (currentToken[0] === "@") {
            const parameters = currentToken.slice(1).split(",");
            const types: WaveType[] = ["square50", "square25", "square12.5", "triangle", "saw", "sine", "noise"];
            if (parameters.length === 1) {
                tone.push({
                    type: types[Number(parameters[0])],
                    volume: 1,
                    octave: 0,
                    detune: 1
                });
            } else if (parameters.length === 2) {
                tone.push({
                    type: types[Number(parameters[0])],
                    volume: Number(parameters[1]) / 100,
                    octave: 0,
                    detune: 1
                });
            } else if (parameters.length === 3) {
                tone.push({
                    type: types[Number(parameters[0])],
                    volume: Number(parameters[1]) / 100,
                    octave: Number(parameters[2]),
                    detune: 0
                });
            } else {
                tone.push({
                    type: types[Number(parameters[0])],
                    volume: Number(parameters[1]) / 100,
                    octave: Number(parameters[2]),
                    detune: Number(parameters[3]) / 100
                });
            }
        }
    }
    if (voiceChannel) {
        const stream = new ReadableStreamBuffer();
        stream.push(buffer);
        return stream;
    } else {
        const header = Buffer.alloc(48);
        header.write("RIFF", 0);
        header.writeUInt32LE(bufferLength * 2 + 36, 4);
        header.write("WAVEfmt ", 8);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(1, 22);
        header.writeUInt32LE(sampling, 24);
        header.writeUInt32LE(sampling * 2, 28);
        header.writeUInt16LE(2, 32);
        header.writeUInt16LE(16, 34);
        header.write("data", 36);
        header.writeUInt32LE(bufferLength * 2, 40);
        return Buffer.concat([header, buffer], 44 + bufferLength * 2);
    }
}