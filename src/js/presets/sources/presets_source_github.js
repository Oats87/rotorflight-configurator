import PresetsSource from "@/js/presets/sources/presets_source.js";

export default class PresetsSourceGithub extends PresetsSource {
    // constructor(urlRepo = "", branch = "", official = false, name = "Unknown") {
    constructor(presetSourceMetadata) {
        //console.log("PresetsSourceGithub constructor urlRepo: " + urlRepo + " branch: " + branch + " official: " + official + " name: " + name);
        let correctUrlRepo = presetSourceMetadata.url.trim();

        if (!correctUrlRepo.endsWith("/")) {
            correctUrlRepo += "/";
        }
        
        let correctBranch = presetSourceMetadata.branch.trim();

        if (correctBranch.startsWith("/")) {
            correctBranch = correctBranch.slice(1);
        }

        if (correctBranch.endsWith("/")) {
            correctBranch = correctBranch.slice(0, -1);
        }

        const urlRaw = `https://raw.githubusercontent.com${correctUrlRepo.slice("https://github.com".length)}${correctBranch}/`;
        const urlViewOnline = `${correctUrlRepo}blob/${correctBranch}/`;

        super(presetSourceMetadata, urlRaw, urlViewOnline);
    }
}
