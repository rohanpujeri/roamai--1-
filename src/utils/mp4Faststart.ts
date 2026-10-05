/**
 * MP4 Faststart Utility
 * Relocates the MOOV (movie metadata) atom before the MDAT (media data) atom
 * in ISOBMFF / MP4 video containers without re-encoding frames.
 *
 * This allows browsers and mobile devices to start progressive playback
 * instantly on the first HTTP range chunk without waiting for the full file to download.
 */

export async function optimizeMp4ForWeb(file: File | Blob): Promise<Blob | File> {
  // Only process video files
  const type = file.type || '';
  if (!type.includes('mp4') && !type.includes('quicktime') && !type.includes('video')) {
    return file;
  }

  try {
    const buffer = await file.arrayBuffer();
    const optimizedBuffer = makeFaststartMp4(buffer);
    if (optimizedBuffer === buffer) {
      return file; // Already faststart
    }

    // Preserve original file name if File instance
    if (file instanceof File) {
      return new File([optimizedBuffer], file.name, {
        type: file.type || 'video/mp4',
        lastModified: file.lastModified
      });
    }

    return new Blob([optimizedBuffer], { type: file.type || 'video/mp4' });
  } catch (err) {
    console.warn('[mp4Faststart] Faststart optimization bypassed:', err);
    return file;
  }
}

/**
 * Core ISOBMFF faststart atom rearrangement algorithm.
 * Moves MOOV box to precede MDAT box and shifts chunk offset tables (stco / co64).
 */
export function makeFaststartMp4(inputBuffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(inputBuffer);
  const totalLength = inputBuffer.byteLength;
  let offset = 0;

  let ftypOffset = -1;
  let ftypSize = 0;
  let mdatOffset = -1;
  let mdatSize = 0;
  let moovOffset = -1;
  let moovSize = 0;

  // Scan top-level atoms
  while (offset < totalLength - 8) {
    let atomSize = view.getUint32(offset);
    const atomType = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7)
    );

    if (atomSize === 1) {
      // 64-bit size
      const high = view.getUint32(offset + 8);
      const low = view.getUint32(offset + 12);
      atomSize = high * 4294967296 + low;
    } else if (atomSize === 0) {
      atomSize = totalLength - offset;
    }

    if (atomType === 'ftyp' && ftypOffset === -1) {
      ftypOffset = offset;
      ftypSize = atomSize;
    } else if (atomType === 'mdat' && mdatOffset === -1) {
      mdatOffset = offset;
      mdatSize = atomSize;
    } else if (atomType === 'moov' && moovOffset === -1) {
      moovOffset = offset;
      moovSize = atomSize;
    }

    if (atomSize <= 0) break;
    offset += atomSize;
  }

  // If moov is already before mdat, the video is already streaming-optimized
  if (moovOffset !== -1 && mdatOffset !== -1 && moovOffset < mdatOffset) {
    return inputBuffer;
  }

  // If missing standard atoms, return original buffer
  if (moovOffset === -1 || mdatOffset === -1 || ftypOffset === -1) {
    return inputBuffer;
  }

  // Create a copy of moov to patch chunk offsets
  const moovBuffer = inputBuffer.slice(moovOffset, moovOffset + moovSize);
  const moovView = new DataView(moovBuffer);
  const shiftAmount = moovSize;

  // Search inside moov for stco (32-bit) and co64 (64-bit) chunk offset tables
  for (let i = 0; i < moovSize - 8; i++) {
    const boxType = String.fromCharCode(
      moovView.getUint8(i + 4),
      moovView.getUint8(i + 5),
      moovView.getUint8(i + 6),
      moovView.getUint8(i + 7)
    );

    if (boxType === 'stco') {
      const entryCount = moovView.getUint32(i + 12);
      let entryOffset = i + 16;
      for (let j = 0; j < entryCount; j++) {
        if (entryOffset + 4 <= moovSize) {
          const currentOffset = moovView.getUint32(entryOffset);
          moovView.setUint32(entryOffset, currentOffset + shiftAmount);
          entryOffset += 4;
        }
      }
    } else if (boxType === 'co64') {
      const entryCount = moovView.getUint32(i + 12);
      let entryOffset = i + 16;
      for (let j = 0; j < entryCount; j++) {
        if (entryOffset + 8 <= moovSize) {
          const high = moovView.getUint32(entryOffset);
          const low = moovView.getUint32(entryOffset + 4);
          let currentOffset = BigInt(high) * 4294967296n + BigInt(low);
          currentOffset += BigInt(shiftAmount);
          moovView.setUint32(entryOffset, Number(currentOffset >> 32n));
          moovView.setUint32(entryOffset + 4, Number(currentOffset & 0xffffffffn));
          entryOffset += 8;
        }
      }
    }
  }

  // Assemble the faststart container: ftyp + patched moov + mdat
  const result = new Uint8Array(totalLength);
  let pos = 0;

  // 1. Write ftyp
  result.set(new Uint8Array(inputBuffer, ftypOffset, ftypSize), pos);
  pos += ftypSize;

  // 2. Write patched moov
  result.set(new Uint8Array(moovBuffer), pos);
  pos += moovSize;

  // 3. Write mdat
  result.set(new Uint8Array(inputBuffer, mdatOffset, mdatSize), pos);
  pos += mdatSize;

  return result.buffer;
}
