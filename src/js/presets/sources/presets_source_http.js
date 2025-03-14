import PresetsSource from "@/js/presets/sources/presets_source.js";

export default class PresetsSourceHttp extends PresetsSource {
    constructor(presetsSourceMetadata) {
        let correctUrl = presetsSourceMetadata.url.trim();

        if (!correctUrl.endsWith("/")) {
            correctUrl += "/";
        }

        const urlRaw = correctUrl;
        const urlViewOnline = correctUrl;

        super(presetsSourceMetadata, urlRaw, urlViewOnline);
    }
}
