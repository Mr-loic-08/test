# Icône ML pour le build desktop (Electron)

Votre logo source haute définition est dans ce dossier :

- `public/logo-ml.png` (512 px, fond noir) — à convertir en icônes natives.

## Windows (.ico)

```bash
# Avec ImageMagick :
convert public/logo-ml.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
```

Puis dans votre config Electron Builder (`package.json`) :

```json
"build": {
  "win": { "icon": "build/icon.ico" }
}
```

## macOS (.icns)

```bash
mkdir -p build/icon.iconset
sips -z 16 16     public/logo-ml.png --out build/icon.iconset/icon_16x16.png
sips -z 32 32     public/logo-ml.png --out build/icon.iconset/icon_16x16@2x.png
sips -z 32 32     public/logo-ml.png --out build/icon.iconset/icon_32x32.png
sips -z 64 64     public/logo-ml.png --out build/icon.iconset/icon_32x32@2x.png
sips -z 128 128   public/logo-ml.png --out build/icon.iconset/icon_128x128.png
sips -z 256 256   public/logo-ml.png --out build/icon.iconset/icon_128x128@2x.png
sips -z 256 256   public/logo-ml.png --out build/icon.iconset/icon_256x256.png
sips -z 512 512   public/logo-ml.png --out build/icon.iconset/icon_256x256@2x.png
iconutil -c icns build/icon.iconset -o build/icon.icns
```

```json
"build": {
  "mac": { "icon": "build/icon.icns" }
}
```

## Linux (.png)

```json
"build": {
  "linux": { "icon": "public/logo-ml.png" }
}
```

## Écran de lancement (splash)

Déjà intégré dans l'app : `src/components/Splash.tsx` affiche le logo ML animé
au démarrage (~2,5 s avec fondu). Aucune action requise.

## Onglet navigateur

Le favicon ML est intégré en SVG data-URI dans `index.html` :
aucun fichier externe, fonctionne hors-ligne et en build single-file.
