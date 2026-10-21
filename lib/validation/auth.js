import { z } from "zod";

export const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200;

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .pipe(z.email("Enter a valid email address."));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX, "That password is too long."),
});

export const PASSWORD_RULES = [
  { label: `At least ${PASSWORD_MIN} characters`, test: (p) => p.length >= PASSWORD_MIN },
  { label: "A letter", test: (p) => /\p{L}/u.test(p) },
  { label: "A number", test: (p) => /\d/.test(p) },
];

export const signUpSchema = z.object({
  name: z.string().trim().max(100, "Keep your name under 100 characters."),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
    .max(PASSWORD_MAX, "That password is too long.")
    .regex(/\p{L}/u, "Include at least one letter.")
    .regex(/\d/, "Include at least one number."),
});

export function validate(schema, values) {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };
  const errors = {};
  for (const issue of result.error.issues) errors[issue.path[0]] ??= issue.message;
  return { data: null, errors };
}
