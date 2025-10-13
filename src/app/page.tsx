// app/page.tsx
'use client';

import { useState } from 'react';
import { Upload, FileAudio, Download, AlertCircle, CheckCircle2, Video } from 'lucide-react';

interface CompressionResult {
  url: string;
  originalSize: string;
  compressedSize: string;
  reduction: string;
  fileType: 'audio' | 'video';
}

export default function MP3Compressor() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    const validTypes = ['audio/mpeg', 'video/mp4', 'audio/mp4'];
    
    if (selectedFile && validTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    } else {
      setError('Por favor, selecione um arquivo MP3 ou MP4 válido');
      setFile(null);
    }
  };

  const compressAudio = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/compress-mp3', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao comprimir o arquivo');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const originalSize = (file.size / (1024 * 1024)).toFixed(2);
      const compressedSize = (blob.size / (1024 * 1024)).toFixed(2);
      const fileType = file.type.includes('video') ? 'video' : 'audio';

      setResult({
        url,
        originalSize,
        compressedSize,
        reduction: ((1 - blob.size / file.size) * 100).toFixed(1),
        fileType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar o arquivo');
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <FileAudio className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Compressor de MP3/MP4
            </h1>
            <p className="text-gray-600">
              Comprima seus arquivos de áudio e vídeo para menos de 4 MB
            </p>
          </div>

          <div className="space-y-6">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
              <input
                type="file"
                id="file-upload"
                accept="audio/mpeg,video/mp4,audio/mp4"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <span className="text-lg font-medium text-gray-700 mb-1">
                  Clique para selecionar
                </span>
                <span className="text-sm text-gray-500">
                  ou arraste um arquivo MP3 ou MP4 aqui
                </span>
              </label>
            </div>

            {/* File Info */}
            {file && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {file.type.includes('video') ? (
                      <Video className="w-5 h-5 text-purple-600" />
                    ) : (
                      <FileAudio className="w-5 h-5 text-purple-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-800">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatSize(file.size)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={compressAudio}
                    disabled={uploading}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? 'Comprimindo...' : 'Comprimir'}
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start space-x-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Success Result */}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold text-green-900">
                    Compressão concluída!
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600">Original</p>
                    <p className="text-lg font-bold text-gray-800">
                      {result.originalSize} MB
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600">Comprimido</p>
                    <p className="text-lg font-bold text-green-600">
                      {result.compressedSize} MB
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600">Redução</p>
                    <p className="text-lg font-bold text-purple-600">
                      {result.reduction}%
                    </p>
                  </div>
                </div>

                <a
                  href={result.url}
                  download={`comprimido.${result.fileType === 'video' ? 'mp4' : 'mp3'}`}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <span>Baixar {result.fileType === 'video' ? 'MP4' : 'MP3'} Comprimido</span>
                </a>
              </div>
            )}

            {/* Loading State */}
            {uploading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-purple-600 mb-4"></div>
                <p className="text-gray-600 font-medium">
                  Comprimindo seu arquivo...
                </p>
              </div>
            )}
          </div>
        </div>

  
      </div>
    </div>
  );
}