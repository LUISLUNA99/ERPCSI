import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .email('Ingresa un correo valido'),
  password: z
    .string()
    .min(1, 'La contrasena es obligatoria')
    .min(6, 'La contrasena debe tener al menos 6 caracteres'),
})

export type LoginFormData = z.infer<typeof loginSchema>
