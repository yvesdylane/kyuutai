export async function uploadAudio(
  buffer: Buffer,
  folder: string,
  filename: string
): Promise<string> {
  const cloudinaryUrl = process.env.CLOUDINARY_URL
  if (!cloudinaryUrl || !cloudinaryUrl.startsWith("cloudinary://")) {
    throw new Error("Cloudinary not configured. Set CLOUDINARY_URL in .env")
  }

  const { v2: cloudinary } = await import("cloudinary")

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: `kyuutai/${folder}`,
        public_id: filename.replace(/\.mp3$/, ""),
        format: "mp3",
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result!.secure_url)
      }
    )
    uploadStream.end(buffer)
  })
}

export async function uploadProfileImage(
  file: File,
  userId: string
): Promise<string> {
  const cloudinaryUrl = process.env.CLOUDINARY_URL
  if (!cloudinaryUrl || !cloudinaryUrl.startsWith("cloudinary://")) {
    throw new Error("Cloudinary not configured. Set CLOUDINARY_URL in .env")
  }

  const { v2: cloudinary } = await import("cloudinary")

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "kyuutai",
        public_id: `${userId}-${Date.now()}`,
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
        ],
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result!.secure_url)
      }
    )
    uploadStream.end(buffer)
  })
}
