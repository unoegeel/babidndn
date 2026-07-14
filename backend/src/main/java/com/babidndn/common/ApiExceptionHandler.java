package com.babidndn.common;
import org.springframework.http.*;import org.springframework.web.bind.MethodArgumentNotValidException;import org.springframework.web.bind.annotation.*;import java.util.Map;
@RestControllerAdvice
public class ApiExceptionHandler {
 @ExceptionHandler(NotFoundException.class) ResponseEntity<Map<String,String>> notFound(NotFoundException e){return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message",e.getMessage()));}
 @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class}) ResponseEntity<Map<String,String>> badRequest(Exception e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
}
