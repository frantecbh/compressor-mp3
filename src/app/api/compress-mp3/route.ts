import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

const execPromise = promisify(exec);

interface ExecResult {
  stdout: string;
  stderr: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let inputPath = '';
  let outputPath = '';

  try {
    console.log('📥 Recebendo arquivo...');
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.error('❌ Nenhum arquivo enviado');
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    console.log(`📄 Arquivo recebido: ${file.name} (${file.size} bytes)`);

    const isVideo = file.type.includes('video');
    const fileExtension = isVideo ? 'mp4' : 'mp3';

    // Criar arquivos temporários
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const tempDir = os.tmpdir();
    inputPath = path.join(tempDir, `input-${Date.now()}.${fileExtension}`);
    outputPath = path.join(tempDir, `output-${Date.now()}.${fileExtension}`);

    console.log(`💾 Salvando arquivo temporário: ${inputPath}`);
    await writeFile(inputPath, buffer);

    // Verificar se FFmpeg está disponível
    try {
      await execPromise('ffmpeg -version');
      console.log('✅ FFmpeg encontrado');
    } catch (err) {
      console.error('❌ FFmpeg não encontrado');
      throw new Error('FFmpeg não está instalado. Por favor, instale o FFmpeg para usar esta funcionalidade.');
    }

    // Calcular duração do arquivo
    console.log('⏱️ Calculando duração...');
    const { stdout }: ExecResult = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`
    );
    
    const duration = parseFloat(stdout);
    console.log(`⏱️ Duração: ${duration.toFixed(2)}s`);

    if (!duration || duration <= 0) {
      throw new Error('Não foi possível determinar a duração do arquivo');
    }

    // Calcular bitrate para ficar abaixo de 4MB
    const targetSizeKB = 4000; // 4MB em KB
    const targetBitrate = Math.floor((targetSizeKB * 8) / duration);

    let ffmpegCommand: string;

    if (isVideo) {
      // Para vídeo: comprimir tanto áudio quanto vídeo
      const videoBitrate = Math.min(Math.floor(targetBitrate * 0.85), 1000);
      const audioBitrate = Math.min(Math.floor(targetBitrate * 0.15), 128);
      
      console.log(`🎬 Comprimindo vídeo - Video: ${videoBitrate}k, Audio: ${audioBitrate}k`);
      
      ffmpegCommand = `ffmpeg -i "${inputPath}" -b:v ${videoBitrate}k -b:a ${audioBitrate}k -vcodec libx264 -preset fast -crf 28 -maxrate ${videoBitrate}k -bufsize ${videoBitrate * 2}k -y "${outputPath}"`;
    } else {
      // Para áudio: apenas comprimir o áudio
      const safeBitrate = Math.min(targetBitrate, 128);
      
      console.log(`🎵 Comprimindo áudio - Bitrate: ${safeBitrate}k`);
      
      ffmpegCommand = `ffmpeg -i "${inputPath}" -b:a ${safeBitrate}k -ar 44100 -y "${outputPath}"`;
    }

    // Comprimir usando ffmpeg
    console.log('🔄 Executando FFmpeg...');
    const { stderr } = await execPromise(ffmpegCommand);
    console.log('✅ Compressão concluída');

    // Ler arquivo comprimido
    console.log('📤 Lendo arquivo comprimido...');
    const compressedBuffer = await readFile(outputPath);
    console.log(`✅ Arquivo comprimido: ${compressedBuffer.length} bytes`);

    // Limpar arquivos temporários
    console.log('🧹 Limpando arquivos temporários...');
    await unlink(inputPath).catch(err => console.warn('Aviso ao deletar input:', err));
    await unlink(outputPath).catch(err => console.warn('Aviso ao deletar output:', err));

    // Retornar arquivo comprimido
    return new NextResponse(compressedBuffer, {
      headers: {
        'Content-Type': isVideo ? 'video/mp4' : 'audio/mpeg',
        'Content-Disposition': `attachment; filename="comprimido.${fileExtension}"`,
      },
    });

  } catch (error) {
    console.error('❌ Erro detalhado:', error);
    
    // Limpar arquivos temporários em caso de erro
    if (inputPath) {
      await unlink(inputPath).catch(() => {});
    }
    if (outputPath) {
      await unlink(outputPath).catch(() => {});
    }

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao processar o arquivo';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}