"""
Unit tests for AuthService
Tests password hashing, verification, and login functionality
"""

import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from services.auth_service import AuthService, hash_password, verify_password


class TestPasswordHashing:
    """Test password hashing and verification"""
    
    def test_hash_password_returns_argon2_hash(self):
        """Test that hash_password returns an Argon2 hash"""
        password = "test123"
        hashed = hash_password(password)
        
        assert hashed.startswith('$argon2')
        assert len(hashed) > 50
        assert hashed != password
    
    def test_hash_password_different_for_same_input(self):
        """Test that same password produces different hashes (due to random salt)"""
        password = "test123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        # Hashes should be different due to random salt
        assert hash1 != hash2
    
    def test_verify_password_correct_argon2(self):
        """Test password verification with correct password (Argon2)"""
        password = "test123"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) == True
    
    def test_verify_password_incorrect_argon2(self):
        """Test password verification with incorrect password (Argon2)"""
        password = "test123"
        hashed = hash_password(password)
        
        assert verify_password("wrong", hashed) == False
    
    def test_verify_password_legacy_sha256(self):
        """Test password verification with legacy SHA-256 hash"""
        # SHA-256 hash of "test123" with default salt
        legacy_hash = "64" * 32  # 64 character hex string
        
        # Should return False for incorrect password
        assert verify_password("wrong", legacy_hash) == False
    
    def test_verify_password_plain_text(self):
        """Test password verification with plain text (legacy)"""
        password = "test123"
        
        assert verify_password(password, password) == True
        assert verify_password("wrong", password) == False


class TestAuthService:
    """Test AuthService login functionality"""
    
    @patch('data.repository.repo')
    @patch('services.auth_service.AuditService')
    def test_login_success_with_argon2(self, mock_audit, mock_repo):
        """Test successful login with Argon2 hashed password"""
        # Setup
        password = "test123"
        hashed = hash_password(password)
        
        users_df = pd.DataFrame([{
            "Username": "testuser",
            "Password": hashed,
            "Name": "Test User",
            "Role": "ADMIN",
            "Branch_ID": "HEAD"
        }])
        
        mock_repo.get_data.return_value = users_df
        
        # Execute
        result = AuthService.login("testuser", password)
        
        # Assert
        assert result is not None
        assert result["user_id"] == "testuser"
        assert result["user_name"] == "Test User"
        assert result["user_role"] == "ADMIN"
        assert result["logged_in"] == True
        
        # Verify audit log was called
        mock_audit.log_action.assert_called_once()
    
    @patch('data.repository.repo')
    @patch('services.auth_service.AuditService')
    def test_login_invalid_username(self, mock_audit, mock_repo):
        """Test login with invalid username"""
        # Setup
        users_df = pd.DataFrame([{
            "Username": "testuser",
            "Password": hash_password("test123"),
            "Name": "Test User",
            "Role": "ADMIN",
            "Branch_ID": "HEAD"
        }])
        
        mock_repo.get_data.return_value = users_df
        
        # Execute
        result = AuthService.login("invaliduser", "test123")
        
        # Assert
        assert result is None
    
    @patch('data.repository.repo')
    @patch('services.auth_service.AuditService')
    def test_login_invalid_password(self, mock_audit, mock_repo):
        """Test login with invalid password"""
        # Setup
        users_df = pd.DataFrame([{
            "Username": "testuser",
            "Password": hash_password("test123"),
            "Name": "Test User",
            "Role": "ADMIN",
            "Branch_ID": "HEAD"
        }])
        
        mock_repo.get_data.return_value = users_df
        
        # Execute
        result = AuthService.login("testuser", "wrongpassword")
        
        # Assert
        assert result is None
        
        # Verify failed login was logged
        mock_audit.log_action.assert_called_with(
            "testuser", "LOGIN_FAILED", "AuthService", "Invalid credentials", "Failed"
        )
    
    @patch('data.repository.repo')
    @patch('services.auth_service.AuditService')
    def test_login_auto_migrates_legacy_password(self, mock_audit, mock_repo):
        """Test that legacy passwords are auto-migrated to Argon2"""
        # Setup - plain text password
        users_df = pd.DataFrame([{
            "Username": "testuser",
            "Password": "test123",  # Plain text
            "Name": "Test User",
            "Role": "ADMIN",
            "Branch_ID": "HEAD"
        }])
        
        mock_repo.get_data.return_value = users_df
        
        # Execute
        result = AuthService.login("testuser", "test123")
        
        # Assert
        assert result is not None
        
        # Verify password was migrated
        mock_repo.update_data.assert_called_once()
        call_args = mock_repo.update_data.call_args
        updated_password = call_args[0][1]["Password"]
        
        # New password should be Argon2 hash
        assert updated_password.startswith('$argon2')
    
    @patch('data.repository.repo')
    def test_login_empty_users_table(self, mock_repo):
        """Test login when users table is empty"""
        # Setup
        mock_repo.get_data.return_value = pd.DataFrame()
        
        # Execute
        result = AuthService.login("testuser", "test123")
        
        # Assert
        assert result is None
    
    def test_check_permission_super_admin(self):
        """Test that super admin has all permissions"""
        import streamlit as st
        
        # Mock session state
        with patch.object(st, 'session_state', {
            "logged_in": True,
            "user_role": "SUPER_ADMIN"
        }):
            assert AuthService.check_permission("any_permission") == True
    
    def test_check_permission_regular_user(self):
        """Test permission check for regular user"""
        import streamlit as st
        
        # Mock session state
        with patch.object(st, 'session_state', {
            "logged_in": True,
            "user_role": "DISPATCHER"
        }):
            assert AuthService.check_permission("manage_jobs") == True
            assert AuthService.check_permission("manage_finance") == False
    
    def test_check_permission_not_logged_in(self):
        """Test permission check when not logged in"""
        import streamlit as st
        
        # Mock session state
        with patch.object(st, 'session_state', {}):
            assert AuthService.check_permission("any_permission") == False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
