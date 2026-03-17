export async function compressAndConvertToWebP(file: File): Promise<File> {
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

        // Redimensionar para largura máxima de 1200px proporcionalmente
        if (width > 1200) {
          height = Math.round((height * 1200) / width);
          width = 1200;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível obter o contexto do canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Converter para WebP com qualidade de 80%
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
          0.8
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
