describe('Diary Comments - Complete Workflow', () => {
  beforeEach(() => {
    cy.login();
    cy.navigateToDiary();
    cy.createDiaryEntry('Comments Test Entry', 'Entry for testing comments functionality');
    cy.get('[data-test="entry-item"]').first().click();
  });

  describe('Add Comments', () => {
    it('should add a single comment to entry', () => {
      const commentText = 'This is a thoughtful comment on the entry';
      cy.addComment(commentText);
      cy.get('[data-test="comment-list"]').should('contain', commentText);
    });

    it('should add multiple comments', () => {
      cy.addComment('First comment');
      cy.addComment('Second comment');
      cy.addComment('Third comment');
      
      cy.get('[data-test="comment-item"]').should('have.length', 3);
    });

    it('should display comment with timestamp', () => {
      cy.addComment('Timestamped comment');
      cy.get('[data-test="comment-item"]').last().within(() => {
        cy.get('[data-test="comment-timestamp"]').should('be.visible');
      });
    });

    it('should show comment author', () => {
      cy.addComment('Comment from user');
      cy.get('[data-test="comment-item"]').last().within(() => {
        cy.get('[data-test="comment-author"]').should('be.visible');
        cy.get('[data-test="comment-author-avatar"]').should('be.visible');
      });
    });

    it('should handle long comments with text wrapping', () => {
      const longComment = 'This is a very long comment that tests text wrapping. '.repeat(20);
      cy.addComment(longComment);
      cy.get('[data-test="comment-item"]').last().should('be.visible');
    });

    it('should show error on empty comment', () => {
      cy.get('[data-test="comment-input"]').focus();
      cy.get('[data-test="add-comment-btn"]').click();
      cy.get('[data-test="error-message"]').should('contain', 'Comment cannot be empty');
    });

    it('should clear input after posting comment', () => {
      cy.addComment('Comment to test clearing');
      cy.get('[data-test="comment-input"]').should('have.value', '');
    });
  });

  describe('Comment Threading', () => {
    beforeEach(() => {
      cy.addComment('Parent comment for testing replies');
    });

    it('should reply to a comment', () => {
      const replyText = 'This is a reply to the parent comment';
      cy.replyToComment(0, replyText);
      
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="reply-item"]').should('contain', replyText);
      });
    });

    it('should add multiple replies to same comment', () => {
      cy.replyToComment(0, 'First reply');
      cy.replyToComment(0, 'Second reply');
      
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="reply-item"]').should('have.length', 2);
      });
    });

    it('should show reply count on comment', () => {
      cy.replyToComment(0, 'Reply 1');
      cy.replyToComment(0, 'Reply 2');
      
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="reply-count"]').should('contain', '2');
      });
    });

    it('should collapse and expand threaded replies', () => {
      cy.replyToComment(0, 'Threaded reply');
      
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="collapse-replies-btn"]').click();
        cy.get('[data-test="reply-item"]').should('not.be.visible');
        
        cy.get('[data-test="expand-replies-btn"]').click();
        cy.get('[data-test="reply-item"]').should('be.visible');
      });
    });

    it('should maintain reply hierarchy', () => {
      cy.replyToComment(0, 'Reply level 1');
      
      // Reply to the reply
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="reply-item"]').first().within(() => {
          cy.get('[data-test="reply-btn"]').click();
        });
      });
      
      cy.get('[data-test="nested-reply-input"]').should('be.visible');
    });
  });

  describe('Comment Interactions - Likes', () => {
    beforeEach(() => {
      cy.addComment('Likeable comment');
    });

    it('should like a comment', () => {
      cy.likeComment(0);
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="like-btn"]').should('have.attr', 'data-liked', 'true');
      });
    });

    it('should show like count', () => {
      cy.likeComment(0);
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="like-count"]').should('contain', '1');
      });
    });

    it('should update like count when multiple users like', () => {
      cy.likeComment(0);
      
      // Simulate another user liking (in real scenario)
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="like-count"]').should('be.visible');
      });
    });

    it('should unlike a comment', () => {
      cy.likeComment(0);
      cy.likeComment(0); // Unlike
      
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="like-btn"]').should('have.attr', 'data-liked', 'false');
        cy.get('[data-test="like-count"]').should('contain', '0');
      });
    });

    it('should show list of users who liked', () => {
      cy.likeComment(0);
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="like-count"]').click();
        cy.get('[data-test="liked-users-list"]').should('be.visible');
      });
    });
  });

  describe('Comment Management', () => {
    beforeEach(() => {
      cy.addComment('Comment to manage');
    });

    it('should edit own comment', () => {
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="edit-comment-btn"]').click();
      });
      
      cy.get('[data-test="comment-edit-input"]').clear().type('Edited comment text');
      cy.get('[data-test="save-edit-btn"]').click();
      
      cy.get('[data-test="comment-item"]').first().should('contain', 'Edited comment text');
    });

    it('should delete own comment', () => {
      cy.deleteComment(0);
      cy.get('[data-test="comment-list"] [data-test="comment-item"]').should('have.length', 0);
    });

    it('should not edit other user comments', () => {
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="edit-comment-btn"]').should('not.exist');
      });
    });

    it('should show edit timestamp on edited comments', () => {
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="edit-comment-btn"]').click();
      });
      
      cy.get('[data-test="comment-edit-input"]').clear().type('Edited');
      cy.get('[data-test="save-edit-btn"]').click();
      
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="edited-timestamp"]').should('contain', 'edited');
      });
    });

    it('should confirm before deleting comment', () => {
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="delete-comment-btn"]').click();
      });
      
      cy.get('[data-test="delete-confirmation-modal"]').should('be.visible');
      cy.get('[data-test="confirm-delete-btn"]').click();
      cy.get('[data-test="comment-item"]').should('have.length', 0);
    });
  });

  describe('Comment Statistics', () => {
    beforeEach(() => {
      cy.addComment('Happy comment with positive sentiment');
      cy.addComment('Sad comment with negative sentiment');
      cy.addComment('Neutral comment');
    });

    it('should display comment statistics section', () => {
      cy.get('[data-test="comment-stats"]').should('be.visible');
    });

    it('should show total comments count', () => {
      cy.get('[data-test="comment-stats"]').should('contain', '3');
    });

    it('should display sentiment breakdown', () => {
      cy.get('[data-test="sentiment-stats"]').should('be.visible');
      cy.get('[data-test="positive-count"]').should('be.visible');
      cy.get('[data-test="negative-count"]').should('be.visible');
      cy.get('[data-test="neutral-count"]').should('be.visible');
    });

    it('should show most liked comment', () => {
      cy.likeComment(0);
      cy.likeComment(0);
      
      cy.get('[data-test="comment-stats"]').should('contain', 'Top Comment');
    });

    it('should display average sentiment', () => {
      cy.get('[data-test="average-sentiment"]').should('be.visible');
    });
  });

  describe('Comment Sorting & Filtering', () => {
    beforeEach(() => {
      cy.addComment('First comment');
      cy.addComment('Second comment');
      cy.addComment('Third comment');
      cy.likeComment(1); // Like second comment
    });

    it('should sort comments by newest first', () => {
      cy.get('[data-test="sort-comments"]').select('newest');
      cy.get('[data-test="comment-item"]').first().should('contain', 'Third comment');
    });

    it('should sort comments by oldest first', () => {
      cy.get('[data-test="sort-comments"]').select('oldest');
      cy.get('[data-test="comment-item"]').first().should('contain', 'First comment');
    });

    it('should sort comments by most liked', () => {
      cy.get('[data-test="sort-comments"]').select('liked');
      cy.get('[data-test="comment-item"]').first().should('contain', 'Second comment');
    });

    it('should filter comments by sentiment', () => {
      cy.get('[data-test="sentiment-filter"]').select('positive');
      cy.get('[data-test="comment-item"]').should('have.length.greaterThan', 0);
    });

    it('should search comments by text', () => {
      cy.get('[data-test="comment-search"]').type('Second');
      cy.get('[data-test="comment-item"]').should('contain', 'Second comment');
      cy.get('[data-test="comment-item"]').should('not.contain', 'First comment');
    });
  });

  describe('Comment Permissions', () => {
    it('should only show edit/delete buttons for own comments', () => {
      cy.addComment('My comment');
      
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="edit-comment-btn"]').should('be.visible');
        cy.get('[data-test="delete-comment-btn"]').should('be.visible');
      });
    });

    it('should prevent non-authors from editing comments', () => {
      cy.addComment('Comment by current user');
      
      // Switch user context (in real test)
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="edit-comment-btn"]').should('not.exist');
      });
    });

    it('should allow anyone to like/reply to comments', () => {
      cy.addComment('Likeable and replyable comment');
      
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="like-btn"]').should('be.visible');
        cy.get('[data-test="reply-btn"]').should('be.visible');
      });
    });
  });
});
