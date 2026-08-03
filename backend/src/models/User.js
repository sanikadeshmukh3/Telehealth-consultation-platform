import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8 },
    role: {
      type: String,
      enum: ["patient", "provider"],
      required: true,
    },

    // --- Provider-only fields ---
    // Left undefined/empty for patients. Kept on the same schema rather than
    // a separate collection since most fields (name/email/password) overlap,
    // and queries like "find this user by id" stay simple either way.
    specialty: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: function () {
        return this.role === "provider" ? "unverified" : undefined;
      },
    },

    // --- Patient-only fields ---
    dateOfBirth: { type: Date },
    // Basic clinical context the intake/documentation agent can reference.
    // Kept intentionally simple here — a real system would likely split this
    // into its own collection with an audit trail, but this is enough for
    // the agent to have something real to query against.
    allergies: [{ type: String, trim: true }],
    medications: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

// Hash the password before saving, but only if it was actually modified
// (otherwise every unrelated update, e.g. changing `name`, would re-hash
// an already-hashed password).
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to check a plaintext password against the stored hash —
// used during login.
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never send the password hash back in API responses, even by accident.
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model("User", userSchema);
