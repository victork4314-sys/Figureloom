import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const required = [
  "install/figureloom-bio-linux.sh",
  "install/linux/figureloom-bio-ide",
  "install/linux/figureloom-bio-copy-tests",
  "install/linux/figureloom-bio-quick-test",
  "install/linux/FigureLoom Bio IDE.desktop",
  "install/linux/FigureLoom Bio Test Files.desktop",
  "install/linux/Run FigureLoom Bio Quick Test.desktop",
  "figureloom-bio/test-files/01-table-and-figure.flbio",
  "figureloom-bio/test-files/02-sequences.flbio",
  "figureloom-bio/test-files/03-reads.flbio",
  "figureloom-bio/test-files/samples.csv",
  "figureloom-bio/test-files/sequences.fasta",
  "figureloom-bio/test-files/reads.fastq",
];

for (const relative of required) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing Linux installer file: ${relative}`);
  }
  if (!fs.statSync(file).size) {
    throw new Error(`Empty Linux installer file: ${relative}`);
  }
}

const installer = fs.readFileSync(path.join(root, "install/figureloom-bio-linux.sh"), "utf8");
for (const phrase of [
  "/opt/figureloom-bio",
  "/home/kasm-default-profile",
  "/etc/skel",
  "FigureLoom Bio IDE.desktop",
  "FigureLoom Bio Test Files",
  "Run FigureLoom Bio Quick Test.desktop",
  'bin/flbio" doctor',
]) {
  if (!installer.includes(phrase)) {
    throw new Error(`Installer is missing required behavior: ${phrase}`);
  }
}

const launcher = fs.readFileSync(path.join(root, "install/linux/figureloom-bio-ide"), "utf8");
for (const phrase of ["python3 -m http.server", "--app=", "127.0.0.1", "/ide/"]) {
  if (!launcher.includes(phrase)) {
    throw new Error(`Desktop IDE launcher is missing: ${phrase}`);
  }
}

for (const desktopName of [
  "FigureLoom Bio IDE.desktop",
  "FigureLoom Bio Test Files.desktop",
  "Run FigureLoom Bio Quick Test.desktop",
]) {
  const content = fs.readFileSync(path.join(root, "install/linux", desktopName), "utf8");
  if (!content.includes("[Desktop Entry]") || !content.includes("Type=Application")) {
    throw new Error(`Invalid desktop entry: ${desktopName}`);
  }
}

console.log("FigureLoom Bio Linux desktop installer files are complete.");
