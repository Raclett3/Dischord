/**
 * These codes are licensed under CC0.
 * https://creativecommons.org/publicdomain/zero/1.0/deed
 */

import * as fs from "fs-extra"

export type Config = {
    token: string
};

let config: Config = {
    token: ""
};

export function configLoad(fileName: string): boolean {
    try {
        let settingString: string = fs.readFileSync(fileName).toString("utf-8");
        let settings: Config = JSON.parse(settingString);

        if (typeof settings.token === "string") {
            config = settings;
            Object.freeze(config);
            return true;
        } else {
            return false;
        }
    } catch (err) {
        if (err.code === "ENOENT") {
            return false;
        } else {
            throw err;
        }
    }
}

export function getConfig() {
    return config;
}