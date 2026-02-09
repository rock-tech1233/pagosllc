
# Sistema de Registro de Pagos con Recibos y Calendario

## Descripción General
Una aplicación web donde tú (administrador) registras los pagos de suscripción de tus clientes, y tanto tú como ellos pueden ver los pagos en un calendario y en una lista con notas. Los clientes inician sesión para ver únicamente sus propios pagos y recibos.

## Backend (Supabase / Lovable Cloud)
Se necesita una base de datos para almacenar clientes, pagos y autenticación:
- **Autenticación**: Login con email y contraseña para clientes y administrador
- **Tabla de perfiles**: Nombre del cliente y datos básicos
- **Tabla de roles**: Distinguir administrador de clientes
- **Tabla de pagos**: Monto, fecha, concepto/nota, estado, referencia al cliente

## Funcionalidades

### 1. Panel del Administrador
- **Registrar pago**: Formulario para seleccionar cliente, monto, fecha, concepto y notas
- **Calendario de pagos**: Vista mensual con todos los pagos de todos los clientes marcados por día
- **Lista de pagos**: Tabla debajo del calendario con historial completo, filtrable por cliente y fecha
- **Gestión de clientes**: Ver y agregar clientes

### 2. Portal del Cliente (con login)
- **Mi calendario**: Vista mensual mostrando solo sus propios pagos
- **Mi historial**: Lista de sus pagos con notas debajo del calendario
- **Ver recibo**: Cada pago genera un recibo con los datos (fecha, monto, concepto) que se puede ver e imprimir/descargar como PDF

### 3. Recibos
- Se generan automáticamente al registrar un pago
- Incluyen: número de recibo, fecha, nombre del cliente, monto, concepto
- El cliente puede verlos desde su portal y descargarlos/imprimirlos

### 4. Diseño
- Interfaz limpia y sencilla en español
- Vista de calendario visual con indicadores de pago por día
- Diseño responsive para que funcione en móvil y escritorio
