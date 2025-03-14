import PresetsSource from "@/js/presets/sources/presets_source.js";

export default class PresetsSourceHttp extends PresetsSource {
    constructor(url, official, name) {
        let correctUrl = url.trim();

        if (!correctUrl.endsWith("/")) {
            correctUrl += "/";
        }

        const urlRaw = correctUrl;
        const urlViewOnline = correctUrl;

        super(urlRaw, urlViewOnline, official, name);
    }
}
