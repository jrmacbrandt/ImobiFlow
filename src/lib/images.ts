export async function compressAndConvertToWebP(file: File): Promise<File> {
  const MAX_FILE_SIZE_MB = 15;
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`O arquivo "${file.name}" excede o limite de ${MAX_FILE_SIZE_MB}MB. Por favor, escolha uma imagem menor.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {

      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIMENSION = 1200; // Tamanho ideal para Retina Desktop/Mobile sem exagero

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível obter o contexto do canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Converter para WebP com qualidade de 75% (Ideal balance between size and quality)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha na conversão para WebP'));
              return;
            }
            // Sanitizar o nome do arquivo para evitar caracteres inválidos no Supabase Storage
            const originalName = file.name.replace(/\.[^/.]+$/, "");
            const sanitizedName = originalName
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-zA-Z0-9-_]/g, "_")
              .toLowerCase();
            
            const newFileName = sanitizedName + ".webp";
            const optimizedFile = new File([blob], newFileName, { type: 'image/webp' });
            resolve(optimizedFile);
          },
          'image/webp',
          0.75
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
