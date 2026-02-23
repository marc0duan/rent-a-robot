declare module "adm-zip" {
  class AdmZip {
    constructor(zipPath?: Buffer | string);
    getEntries(): AdmZipEntry[];
    readFile(entry: AdmZipEntry): Buffer;
  }

  class AdmZipEntry {
    entryName: string;
    isDirectory: boolean;
    getData(): Buffer;
  }

  export = AdmZip;
}
