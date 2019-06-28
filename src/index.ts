/**
 * These codes are licensed under CC0.
 * https://creativecommons.org/publicdomain/zero/1.0/deed
 */

import * as Discord from "discord.js"
import compose from "./compose.js"
import {getConfig, configLoad} from "./config.js"
import {ReadableStreamBuffer} from "stream-buffers";

const client = new Discord.Client();

export async function ready(): Promise<boolean> {
    client.on("message", async message => {
        if (message.author.bot || message.content === "") {
            return;
        }
        let voiceChannel = false;
        if (message.content.slice(0, 3) === "dv!" && message.member.voiceChannel) {
            voiceChannel = true;
        } else if (message.content.slice(0, 3) !== "dc!") {
            return;
        }
        const command = message.content.slice(3);
        if (command.length > 1000) {
            await message.reply("コマンドが長すぎます。");
            return;
        }
        if (command.trim() === "help") {
            message.reply(
                "文法\n" + 
                "dc!でメッセージを始め、MMLという記法で楽譜を記述すると音楽を再生できます。\n" +
                "CDEFGABR それぞれドレミファソラシと休符に対応し、音を鳴らします。直後に数字を指定するとn分音符を鳴らします。ピリオドを付けると付点音符になります。\n" + 
                "L デフォルトの音の長さをn分音符形式で指定します。\n" + 
                "T テンポを指定します。デフォルトは120です。\n" +
                "@ 音を指定します。カンマ区切りでパラメータを指定します。複数指定すると音が重なります。パラメータは以下の通りです。(内容=デフォルト値)\n" +
                "(波形),(音量=100),(オクターブ=±0),(デチューン=100)" +
                "波形は以下の通りです。" +
                "0: 矩形波(デューティー比50%), 1: 矩形波(デューティー比25%), 2: 矩形波(デューティー比12.5%), 3: 三角波, 4: ノコギリ波, 5: サイン波, 6: ノイズ" +
                "< オクターブを上げます。" +
                "> オクターブを下げます。" +
                "() 括弧内の音階を同時に鳴らします。" +
                "yn 音を減衰させます。nが大きいほどより速く減衰します。" +
                "wn 音高を途中で変化させます。nが100より大きければ高く、小さければ低くなります。" +
                "[]n 括弧内の命令をn回繰り返します。ただし0を指定しても必ず1回は実行します。" +
                "; 音を書き込む位置を先頭に戻します。また、音がデフォルトに戻ります。\n\n" +
                "dc!から開始する代わりにdv!から開始するとボイスチャンネルで音声を再生します。"
            );
            return;
        }
        const result = compose(command, voiceChannel);
        if (result === null) {
            message.reply("音声の生成に失敗しました。");
            return;
        }
        if (result instanceof ReadableStreamBuffer) {
            if (message.member.voiceChannel) {
                message.member.voiceChannel.join().then(connection => {
                    const dispatcher = connection.playConvertedStream(result);
                    dispatcher.on("end", () => {
                        connection.disconnect();
                    })
                });
            }
        } else if (result instanceof Buffer) {
            message.reply("", {
                file: {
                    attachment: result,
                    name: "result.wav"
                }
            })
        }
    });

    if (!(await configLoad("./config/config.json"))) {
        return false;
    }
    const config = getConfig();
    await client.login(config.token);
    return true;
}

(async function() {
    console.log(await ready());
})();