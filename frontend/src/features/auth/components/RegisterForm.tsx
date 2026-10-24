import { PasswordInput } from "@/components/ui/password-input";
import {
  Button,
  Link,
  VStack,
  Text,
  Field,
  Input,
  Spinner,
  NativeSelect,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useRegister } from "../hooks/useRegister";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { toast } from "react-toastify";

export const RegisterForm = ({
  onToggleMode,
}: {
  onToggleMode: () => void;
}) => {
  const {
    handleSubmit,
    register,
    formState: { errors },
    getValues
  } = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "TENANT" as const,
    },
    shouldFocusError: false,
  });

  const { mutate, error, isPending, isSuccess } = useRegister();

  const handleRegister = (payload: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: "TENANT" | "LANDLORD";
  }) => mutate(payload);

  const navigate = useNavigate();

  useEffect(() => {
    if (isSuccess) {
      toast.success("Your account was created successfully.");

      const email = getValues("email")
      navigate("/verify-email", { state: { email } });
    }
  }, [isSuccess, navigate, getValues]);

  return (
    <VStack
      gap="6"
      align="stretch"
      w="full"
      as="form"
      onSubmit={handleSubmit(handleRegister)}
    >
      <Text
        fontSize={{ base: "xl", md: "3xl" }}
        fontWeight="bold"
        textAlign="center"
      >
        Create an Account
      </Text>

      {/* Api Response Error */}
      {error && (
        <Text alignSelf="flex-start" fontSize="xs" color="red.500">
          {axios.isAxiosError(error)
            ? error?.response?.data?.message
            : "Internal Server Error"}
        </Text>
      )}

      {/* Username */}
      <VStack gap="4">
        <Field.Root invalid={!!errors.username}>
          <Field.Label>Username</Field.Label>
          <Input
            variant="flushed"
            placeholder="Enter Your Username"
            colorPalette="blue"
            {...register("username", {
              required: "Username is required",
              minLength: {
                value: 2,
                message: "Username must be at least 2 characters",
              },
            })}
          />
          <Field.ErrorText>{errors.username?.message}</Field.ErrorText>
        </Field.Root>

        {/* Email */}
        <Field.Root invalid={!!errors.email}>
          <Field.Label>Email</Field.Label>
          <Input
            variant="flushed"
            placeholder="Enter Your Email"
            colorPalette="blue"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            })}
          />
          <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
        </Field.Root>

        {/* Role */}
        <Field.Root invalid={!!errors.role}>
          <Field.Label>Account type</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              colorPalette="blue"
              {...register("role", { required: "Please select an account type" })}
            >
              <option value="TENANT">Tenant</option>
              <option value="LANDLORD">Landlord</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Field.ErrorText>{errors.role?.message}</Field.ErrorText>
        </Field.Root>

        {/* Password */}
        <Field.Root invalid={!!errors.password}>
          <Field.Label>Password</Field.Label>
          <PasswordInput
            variant="flushed"
            placeholder="Enter Your Password"
            colorPalette="blue"
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
          />
          <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
        </Field.Root>

        {/* Confirm Password */}
        <Field.Root invalid={!!errors.confirmPassword}>
          <Field.Label>Confirm Password</Field.Label>
          <PasswordInput
            variant="flushed"
            placeholder="Confirm Your Password"
            colorPalette="blue"
            {...register("confirmPassword", {
              required: "Confirm-Password is required",
              validate: (value, formValues) => {
                return (
                  value === formValues.password || "Passwords do not match"
                );
              },
            })}
          />
          <Field.ErrorText>{errors.confirmPassword?.message}</Field.ErrorText>
        </Field.Root>
      </VStack>

      <Button
        type="submit"
        size="lg"
        colorPalette="blue"
        borderRadius="lg"
        w="full"
        shadow="md"
      >
        {isPending ? <Spinner size="sm" /> : "Register now"}
      </Button>

      <Text fontSize="sm" color="gray.500" textAlign="center">
        Already have an account?
        <Link
          color="blue.500"
          _hover={{ textDecor: "underline" }}
          ml="1"
          onClick={onToggleMode}
        >
          Login
        </Link>
      </Text>
    </VStack>
  );
};
