function importSRTFile(filePath) {
    try {
        var fileToImport = new File(filePath);
        if (!fileToImport.exists) {
            return "Dosya bulunamadı: " + filePath;
        }
        
        // Premiere Pro'ya aktar
        var filePaths = [filePath];
        
        // targetBin en güvenli şekilde rootItem seçilir
        var targetBin = app.project.rootItem;
        
        // importFiles(filePaths, suppressWarnings, targetBin, importAsNumberedStills)
        var success = app.project.importFiles(
            filePaths,
            true, // suppress warnings
            targetBin,
            false // importAsNumberedStills
        );
        
        if (success) {
            return "success";
        } else {
            return "Premiere Pro içe aktarma hatası.";
        }
    } catch (e) {
        return "ExtendScript hatası: " + e.message;
    }
}

function getAudioTracks() {
    try {
        var activeSequence = app.project.activeSequence;
        if (!activeSequence) {
            return "no_active_sequence";
        }
        
        var numTracks = activeSequence.audioTracks.numTracks;
        var trackNames = [];
        for (var i = 0; i < numTracks; i++) {
            var track = activeSequence.audioTracks[i];
            trackNames.push(track.name || ("Ses " + (i + 1)));
        }
        return trackNames.join("||");
    } catch (e) {
        return "error: " + e.message;
    }
}

function exportTrackAudio(trackIndex, outputPath) {
    try {
        var activeSequence = app.project.activeSequence;
        if (!activeSequence) {
            return "Aktif bir sekans (timeline) bulunamadı.";
        }
        
        var numTracks = activeSequence.audioTracks.numTracks;
        
        // Ses kanalları indeks kontrolü
        if (trackIndex < -1 || trackIndex >= numTracks) {
            return "Geçersiz ses kanalı indeksi.";
        }
        
        // Mevcut dilsizleştirme (mute) durumlarını yedekle
        var originalMutes = [];
        for (var i = 0; i < numTracks; i++) {
            originalMutes.push(activeSequence.audioTracks[i].mute);
        }
        
        // Eğer belirli bir kanal seçildiyse diğerlerini sustur
        if (trackIndex !== -1) {
            for (var i = 0; i < numTracks; i++) {
                if (i === trackIndex) {
                    activeSequence.audioTracks[i].mute = 0; // Ses açık
                } else {
                    activeSequence.audioTracks[i].mute = 1; // Susturuldu
                }
            }
        }
        
        // Premiere Pro'nun kurulu olduğu dizini al ve sistem ses presetini bul
        var appPath = Folder.appPackage.fsName;
        
        // En yaygın ve uyumlu ses preseti: Waveform Audio 48kHz 16-bit (.wav)
        var presetPath = appPath + "/Contents/MediaIO/systempresets/3F3F3F3F_57415645/Waveform Audio 48kHz 16-bit.epr";
        var presetFile = new File(presetPath);
        
        // Eğer bulamazsa alternatif genel AudioOnly.epr dosyasını dene
        if (!presetFile.exists) {
            presetPath = appPath + "/Contents/Settings/EncoderPresets/AudioOnly.epr";
            presetFile = new File(presetPath);
        }
        
        if (!presetFile.exists) {
            // Sessiz durumları eski haline getir
            for (var i = 0; i < numTracks; i++) {
                activeSequence.audioTracks[i].mute = originalMutes[i];
            }
            return "Premiere Pro ses preseti (.epr) bulunamadı: " + presetPath;
        }
        
        // Ses dosyasını dışa aktar (range: 0 = ENCODE_ENTIRE)
        var success = activeSequence.exportAsMediaDirect(outputPath, presetPath, 0);
        
        // Sessiz durumları eski haline getir
        for (var i = 0; i < numTracks; i++) {
            activeSequence.audioTracks[i].mute = originalMutes[i];
        }
        
        if (success) {
            return "success";
        } else {
            return "Ses dosyası dışa aktarılamadı. Lütfen timeline'ınızda ses bulunduğundan emin olun.";
        }
    } catch (e) {
        return "ExtendScript Hatası: " + e.message;
    }
}
